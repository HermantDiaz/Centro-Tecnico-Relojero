-- ============================================================================
-- MIGRACIÓN FASE 3: CONCURRENCIA MULTI-USUARIO, ATOMICIDAD E ÍNDICES B-TREE
-- Proyecto: Relojería IA (tpuxbvdhxpusyzxgzspk)
-- ============================================================================

-- 1. Candado físico contra sobreventa (Overselling) en public.inventario
ALTER TABLE public.inventario
  DROP CONSTRAINT IF EXISTS chk_inventario_stock_no_negativo;

ALTER TABLE public.inventario
  ADD CONSTRAINT chk_inventario_stock_no_negativo CHECK (stock_actual >= 0);

-- Actualizar trigger fun_deducir_inventario con bloqueo atómico y validación de stock
CREATE OR REPLACE FUNCTION public.fun_deducir_inventario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_stock_actual integer;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    IF NEW.producto_id IS NOT NULL THEN
      SELECT stock_actual INTO v_stock_actual
      FROM public.inventario
      WHERE id = NEW.producto_id
      FOR UPDATE;

      IF v_stock_actual IS NULL THEN
        RAISE EXCEPTION 'El producto seleccionado no existe en el inventario.';
      END IF;

      IF v_stock_actual < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente para "%" (Disponible: %, Solicitado: %).',
          COALESCE(NEW.descripcion, 'Artículo'), v_stock_actual, NEW.cantidad;
      END IF;

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

REVOKE EXECUTE ON FUNCTION public.fun_deducir_inventario() FROM PUBLIC, anon, authenticated;

-- 2. RPC Atómico para actualizar el saldo esperado en gaveta (caja_sesiones) sin Race Conditions
CREATE OR REPLACE FUNCTION public.incrementar_cierre_esperado_caja(
  p_sesion_id uuid,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_nuevo_esperado numeric;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  UPDATE public.caja_sesiones
  SET monto_cierre_esperado = COALESCE(monto_cierre_esperado, 0) + COALESCE(p_delta, 0)
  WHERE id = p_sesion_id
  RETURNING monto_cierre_esperado INTO v_nuevo_esperado;

  RETURN v_nuevo_esperado;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.incrementar_cierre_esperado_caja(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.incrementar_cierre_esperado_caja(uuid, numeric) TO authenticated;

-- 3. RPC Atómico para ajustar stock en Taller (Reparaciones) sin Lost Updates
CREATE OR REPLACE FUNCTION public.ajustar_stock_inventario(
  p_producto_id uuid,
  p_delta integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_nuevo_stock integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'No autorizado.';
  END IF;

  UPDATE public.inventario
  SET stock_actual = stock_actual + p_delta
  WHERE id = p_producto_id
    AND (stock_actual + p_delta) >= 0
  RETURNING stock_actual INTO v_nuevo_stock;

  IF v_nuevo_stock IS NULL THEN
    RAISE EXCEPTION 'Stock insuficiente o artículo no encontrado para realizar el ajuste.';
  END IF;

  RETURN v_nuevo_stock;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.ajustar_stock_inventario(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ajustar_stock_inventario(uuid, integer) TO authenticated;

-- 4. Optimización de políticas RLS (evitar re-evaluación por fila auth_rls_initplan)
DROP POLICY IF EXISTS "Permitir todo a autenticados movs" ON public.caja_movimientos;
CREATE POLICY "Permitir todo a autenticados movs"
  ON public.caja_movimientos
  FOR ALL
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Permitir todo a autenticados" ON public.caja_sesiones;
CREATE POLICY "Permitir todo a autenticados"
  ON public.caja_sesiones
  FOR ALL
  TO authenticated
  USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Subcategorias Access" ON public.caja_subcategorias;
CREATE POLICY "Subcategorias Access"
  ON public.caja_subcategorias
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Lectura de perfiles" ON public.perfiles;
DROP POLICY IF EXISTS "Gestión total para admins" ON public.perfiles;
CREATE POLICY "Lectura de perfiles"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING ((id = (SELECT auth.uid())) OR public.es_admin());

CREATE POLICY "Gestión total para admins"
  ON public.perfiles
  FOR ALL
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Actualizacion admin" ON public.empresa_config;
CREATE POLICY "Actualizacion admin"
  ON public.empresa_config
  FOR UPDATE
  TO authenticated
  USING (public.es_admin())
  WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "Gestión de categorias para admin y recepcion" ON public.categorias;
CREATE POLICY "Gestión de categorias para admin y recepcion"
  ON public.categorias
  FOR ALL
  TO authenticated
  USING (public.es_admin() OR public.get_user_rol() = 'recepcion')
  WITH CHECK (public.es_admin() OR public.get_user_rol() = 'recepcion');

-- 5. Creación de los 16 índices B-Tree en llaves foráneas para escalabilidad multi-usuario
CREATE INDEX IF NOT EXISTS idx_auditoria_logs_usuario_id ON public.auditoria_logs (usuario_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_cliente_id ON public.caja_movimientos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_perfil_id ON public.caja_movimientos (perfil_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_sesion_id ON public.caja_movimientos (sesion_id);
CREATE INDEX IF NOT EXISTS idx_caja_movimientos_subcategoria_id ON public.caja_movimientos (subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_detalles_movimiento_id ON public.caja_movimientos_detalles (movimiento_id);
CREATE INDEX IF NOT EXISTS idx_caja_mov_detalles_producto_id ON public.caja_movimientos_detalles (producto_id);
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_abierta_por ON public.caja_sesiones (abierta_por);
CREATE INDEX IF NOT EXISTS idx_caja_sesiones_cerrada_por ON public.caja_sesiones (cerrada_por);
CREATE INDEX IF NOT EXISTS idx_historial_rep_reparacion_id ON public.historial_reparaciones (reparacion_id);
CREATE INDEX IF NOT EXISTS idx_historial_rep_usuario_id ON public.historial_reparaciones (usuario_id);
CREATE INDEX IF NOT EXISTS idx_insumos_rep_insumo_id ON public.insumos_reparacion (insumo_id);
CREATE INDEX IF NOT EXISTS idx_insumos_rep_reparacion_id ON public.insumos_reparacion (reparacion_id);
CREATE INDEX IF NOT EXISTS idx_inventario_categoria_id ON public.inventario (categoria_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_cliente_id ON public.reparaciones (cliente_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_tecnico_asignado_id ON public.reparaciones (tecnico_asignado_id);
CREATE INDEX IF NOT EXISTS idx_reparaciones_numero_recibo ON public.reparaciones (numero_recibo);

