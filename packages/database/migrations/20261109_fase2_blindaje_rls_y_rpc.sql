-- ============================================================================
-- MIGRACIÓN FASE 2: BLINDAJE DE RLS, FUNCIONES SECURITY DEFINER Y RPC B2C
-- Proyecto: Relojería IA (tpuxbvdhxpusyzxgzspk)
-- ============================================================================

-- 1. Endurecer funciones existentes: fijar search_path = public y exigir activo = true
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND rol = 'admin'
      AND COALESCE(activo, true) = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN (
    SELECT rol::text FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND COALESCE(activo, true) = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.perfiles (id, rol, nombre, activo)
  VALUES (new.id, 'tecnico', new.raw_user_meta_data->>'nombre', true);
  RETURN new;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_perfiles_to_user_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('rol', NEW.rol)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fun_deducir_inventario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF NEW.producto_id IS NOT NULL THEN
            UPDATE public.inventario 
            SET stock_actual = stock_actual - NEW.cantidad
            WHERE id = NEW.producto_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.producto_id IS NOT NULL THEN
            UPDATE public.inventario 
            SET stock_actual = stock_actual + OLD.cantidad
            WHERE id = OLD.producto_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fun_sync_tesoreria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.tesoreria_cuentas 
        SET saldo = saldo + (CASE WHEN NEW.tipo = 'ingreso' THEN NEW.monto - COALESCE(NEW.comision_pos, 0) ELSE -NEW.monto END)
        WHERE nombre = NEW.metodo_pago;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.tesoreria_cuentas 
        SET saldo = saldo - (CASE WHEN OLD.tipo = 'ingreso' THEN OLD.monto - COALESCE(OLD.comision_pos, 0) ELSE -OLD.monto END)
        WHERE nombre = OLD.metodo_pago;
    END IF;
    RETURN NULL;
END;
$function$;

-- Revocar ejecución pública vía API REST de funciones exclusivas de triggers
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_perfiles_to_user_metadata() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fun_deducir_inventario() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fun_sync_tesoreria() FROM anon, authenticated;

-- 2. Crear RPC seguro para consulta pública B2C y Chatbot IA de reparaciones
-- Excluye notas_internas, tecnico_asignado_id y clientes.telefono
CREATE OR REPLACE FUNCTION public.consultar_reparacion_publica(p_numero_recibo text)
RETURNS TABLE (
  id uuid,
  numero_recibo text,
  marca text,
  tipo_reloj text,
  modelo_descripcion text,
  estado text,
  problema_cliente text,
  diagnostico_tecnico text,
  precio_final numeric,
  abono numeric,
  saldo_pendiente numeric,
  fecha_compromiso timestamptz,
  fecha_ingreso timestamptz,
  veces_garantia integer,
  cliente_nombre text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_raw text := btrim(COALESCE(p_numero_recibo, ''));
  v_clean text;
BEGIN
  IF v_raw = '' OR char_length(v_raw) > 24 THEN
    RETURN;
  END IF;

  v_clean := regexp_replace(v_raw, '^[#\s]*(?:REP-|REC-)?', '', 'i');
  v_clean := btrim(v_clean);

  IF v_clean = '' OR v_clean !~ '^[A-Za-z0-9-]+$' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.numero_recibo,
    r.marca,
    r.tipo_reloj,
    r.modelo_descripcion,
    r.estado,
    r.problema_cliente,
    r.diagnostico_tecnico,
    r.precio_final,
    r.abono,
    r.saldo_pendiente,
    r.fecha_compromiso,
    r.fecha_ingreso,
    r.veces_garantia,
    c.nombre_completo AS cliente_nombre
  FROM public.reparaciones r
  LEFT JOIN public.clientes c ON c.id = r.cliente_id
  WHERE r.numero_recibo IN (
    v_raw,
    v_clean,
    '#' || v_clean,
    'REP-' || v_clean,
    'REC-' || v_clean
  )
  LIMIT 1;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.consultar_reparacion_publica(text) TO anon, authenticated;

-- 3. Crear RPC seguro para el catálogo público de la Tienda en Línea
-- Excluye precio_compra, stock_minimo e insumos internos de taller
CREATE OR REPLACE FUNCTION public.listar_catalogo_publico()
RETURNS TABLE (
  id uuid,
  codigo text,
  nombre text,
  marca text,
  modelo text,
  descripcion text,
  precio_venta numeric,
  stock_actual integer,
  categoria_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT
    i.id,
    i.codigo,
    i.nombre,
    i.marca,
    i.modelo,
    i.descripcion,
    i.precio_venta,
    i.stock_actual,
    i.categoria_id
  FROM public.inventario i
  WHERE COALESCE(i.es_vendible, true) = true
    AND COALESCE(i.estado, 'activo') = 'activo'
    AND i.stock_actual > 0
  ORDER BY i.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.listar_catalogo_publico() TO anon, authenticated;

-- 4. Cerrar exposición directa del rol anon sobre clientes, reparaciones e inventario
DROP POLICY IF EXISTS "Lectura publica B2C de clientes" ON public.clientes;
DROP POLICY IF EXISTS "Lectura publica B2C de reparaciones" ON public.reparaciones;
DROP POLICY IF EXISTS "Lectura publica B2C de inventario" ON public.inventario;

-- Consolidar políticas de inventario para evitar evaluación duplicada en rol anon
DROP POLICY IF EXISTS "Acceso para Recepción" ON public.inventario;
DROP POLICY IF EXISTS "Gestión de inventario para admins" ON public.inventario;
DROP POLICY IF EXISTS "Gestión de inventario para admin y recepcion" ON public.inventario;

CREATE POLICY "Gestion inventario admin y recepcion"
  ON public.inventario
  FOR ALL
  TO authenticated
  USING (public.es_admin() OR public.get_user_rol() = 'recepcion')
  WITH CHECK (public.es_admin() OR public.get_user_rol() = 'recepcion');

-- 5. Blindar auditoria_logs como bitácora forense inmutable (Append-Only)
DROP POLICY IF EXISTS "Auditoria Auth Access" ON public.auditoria_logs;

CREATE POLICY "Auditoria Insert Auth"
  ON public.auditoria_logs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

CREATE POLICY "Auditoria Select Admin"
  ON public.auditoria_logs
  FOR SELECT
  TO authenticated
  USING (public.es_admin());

-- 6. Restringir tablas financieras sensibles únicamente a usuarios autenticados activos
DROP POLICY IF EXISTS "Deudas Auth Access" ON public.deudas_empresa;
CREATE POLICY "Deudas Admin Access"
  ON public.deudas_empresa
  FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Tesoreria Auth Access" ON public.tesoreria_cuentas;
CREATE POLICY "Tesoreria Admin Recepcion Access"
  ON public.tesoreria_cuentas
  FOR ALL
  TO authenticated
  USING (public.es_admin() OR public.get_user_rol() = 'recepcion')
  WITH CHECK (public.es_admin() OR public.get_user_rol() = 'recepcion');

