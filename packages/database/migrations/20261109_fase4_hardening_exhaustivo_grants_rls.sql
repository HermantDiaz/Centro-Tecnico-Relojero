-- ============================================================================
-- MIGRACIÓN FASE 4: HARDENING EXHAUSTIVO DE GRANTS, RBAC Y BITÁCORA FORENSE
-- Proyecto: Relojería IA (tpuxbvdhxpusyzxgzspk)
-- ============================================================================

-- 1. Función auxiliar para verificar si el usuario autenticado está activo en perfiles
CREATE OR REPLACE FUNCTION public.es_usuario_activo()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = (SELECT auth.uid())
      AND COALESCE(activo, true) = true
  );
END;
$function$;

-- Revocar ejecución desde el rol público anon para funciones internas de RBAC
REVOKE EXECUTE ON FUNCTION public.es_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_rol() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.es_usuario_activo() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.es_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rol() TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_usuario_activo() TO authenticated;

-- Asegurar que las funciones públicas B2C solo sean ejecutables por anon y authenticated
REVOKE EXECUTE ON FUNCTION public.consultar_reparacion_publica(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.listar_catalogo_publico() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consultar_reparacion_publica(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_catalogo_publico() TO anon, authenticated;

-- 2. Revocar TODOS los privilegios de tabla del rol anon en las 14 tablas internas del ERP
-- (Cierra por completo el esquema GraphQL y OpenAPI frente a usuarios no autenticados)
REVOKE ALL ON TABLE
  public.auditoria_logs,
  public.caja_movimientos,
  public.caja_movimientos_detalles,
  public.caja_sesiones,
  public.caja_subcategorias,
  public.categorias,
  public.clientes,
  public.deudas_empresa,
  public.historial_reparaciones,
  public.insumos_reparacion,
  public.inventario,
  public.perfiles,
  public.reparaciones,
  public.tesoreria_cuentas
FROM anon;

-- En empresa_config, anon únicamente necesita SELECT (para membrete público)
REVOKE ALL ON TABLE public.empresa_config FROM anon;
GRANT SELECT ON TABLE public.empresa_config TO anon;

-- En auditoria_logs, revocar UPDATE, DELETE y TRUNCATE incluso para authenticated
REVOKE UPDATE, DELETE, TRUNCATE, TRIGGER ON TABLE public.auditoria_logs FROM authenticated;

-- Revocar TRUNCATE y TRIGGER de todas las tablas operativas para authenticated
REVOKE TRUNCATE, TRIGGER ON TABLE
  public.caja_movimientos,
  public.caja_movimientos_detalles,
  public.caja_sesiones,
  public.caja_subcategorias,
  public.categorias,
  public.clientes,
  public.deudas_empresa,
  public.empresa_config,
  public.historial_reparaciones,
  public.insumos_reparacion,
  public.inventario,
  public.perfiles,
  public.reparaciones,
  public.tesoreria_cuentas
FROM authenticated;

-- 3. Reforzar políticas RLS para exigir cuenta activa (es_usuario_activo) y proteger DELETE

-- 3.1 clientes: lectura/escritura solo personal activo; eliminación solo admin
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON public.clientes;
CREATE POLICY "Clientes Select Insert Update Activos"
  ON public.clientes
  FOR SELECT
  TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "Clientes Insert Activos"
  ON public.clientes
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_usuario_activo());

CREATE POLICY "Clientes Update Activos"
  ON public.clientes
  FOR UPDATE
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

CREATE POLICY "Clientes Delete Admin"
  ON public.clientes
  FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- 3.2 reparaciones: operación por personal activo; eliminación solo admin o recepcion
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON public.reparaciones;
CREATE POLICY "Reparaciones Select Activos"
  ON public.reparaciones
  FOR SELECT
  TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "Reparaciones Insert Activos"
  ON public.reparaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_usuario_activo());

CREATE POLICY "Reparaciones Update Activos"
  ON public.reparaciones
  FOR UPDATE
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

CREATE POLICY "Reparaciones Delete Admin Recepcion"
  ON public.reparaciones
  FOR DELETE
  TO authenticated
  USING (public.es_admin() OR public.get_user_rol() = 'recepcion');

-- 3.3 caja_sesiones, caja_movimientos y detalles: exigir usuario activo
DROP POLICY IF EXISTS "Permitir todo a autenticados" ON public.caja_sesiones;
CREATE POLICY "Caja Sesiones Personal Activo"
  ON public.caja_sesiones
  FOR ALL
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

DROP POLICY IF EXISTS "Permitir todo a autenticados movs" ON public.caja_movimientos;
CREATE POLICY "Caja Movimientos Personal Activo"
  ON public.caja_movimientos
  FOR ALL
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

DROP POLICY IF EXISTS "Permitir todo a usuarios autenticados" ON public.caja_movimientos_detalles;
CREATE POLICY "Caja Detalles Personal Activo"
  ON public.caja_movimientos_detalles
  FOR ALL
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

DROP POLICY IF EXISTS "Subcategorias Access" ON public.caja_subcategorias;
CREATE POLICY "Subcategorias Personal Activo"
  ON public.caja_subcategorias
  FOR ALL
  TO authenticated
  USING (public.es_usuario_activo())
  WITH CHECK (public.es_usuario_activo());

-- 3.4 historial_reparaciones: inmutable (solo SELECT e INSERT por personal activo)
DROP POLICY IF EXISTS "Historial visible para todos" ON public.historial_reparaciones;
DROP POLICY IF EXISTS "Insertar historial" ON public.historial_reparaciones;

CREATE POLICY "Historial Select Activos"
  ON public.historial_reparaciones
  FOR SELECT
  TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "Historial Insert Activos"
  ON public.historial_reparaciones
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_usuario_activo());

-- 3.5 insumos_reparacion: exigir personal activo
DROP POLICY IF EXISTS "Insumos visibles para todos" ON public.insumos_reparacion;
DROP POLICY IF EXISTS "Insertar insumos" ON public.insumos_reparacion;
DROP POLICY IF EXISTS "Eliminar insumos" ON public.insumos_reparacion;

CREATE POLICY "Insumos Select Activos"
  ON public.insumos_reparacion
  FOR SELECT
  TO authenticated
  USING (public.es_usuario_activo());

CREATE POLICY "Insumos Insert Activos"
  ON public.insumos_reparacion
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_usuario_activo());

CREATE POLICY "Insumos Delete Activos"
  ON public.insumos_reparacion
  FOR DELETE
  TO authenticated
  USING (public.es_usuario_activo());

