export interface EmpresaConfig {
  id: string;
  nombre_empresa: string;
  eslogan: string;
  direccion_telefono: string;
  mensaje_despedida: string;
  moneda_principal: string;
}

export interface ClienteResumen {
  nombre_completo?: string;
  telefono?: string;
}

export interface ReparacionData {
  id?: string;
  numero_recibo: string;
  marca: string;
  tipo_reloj?: string;
  modelo_descripcion?: string;
  estado: string;
  falla_declarada?: string;
  problema_cliente?: string;
  diagnostico_tecnico?: string;
  costo_estimado?: number;
  precio_final?: number;
  abono?: number;
  saldo?: number;
  saldo_pendiente?: number;
  fecha_promesa?: string;
  fecha_compromiso?: string;
  fecha_ingreso?: string;
  veces_garantia?: number;
  clientes?: ClienteResumen;
}

export interface CajaSesion {
  id: string;
  abierta_por: string;
  cerrada_por?: string;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_apertura: number;
  monto_cierre_esperado: number;
  monto_cierre_real?: number;
  diferencia: number;
  estado: 'abierta' | 'cerrada';
  notas?: string;
}

export interface MovimientoDetalle {
  producto_id?: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CajaMovimiento {
  id: string;
  sesion_id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  utilidad_neta: number;
  concepto: string;
  categoria: string;
  metodo_pago: 'Efectivo' | 'BAC' | 'LAFISE' | 'BANPRO' | 'POS';
  referencia_id?: string;
  referencia_bancaria?: string;
  perfil_id?: string;
  subcategoria_id?: string;
  cliente_id?: string;
  descuento?: number;
  subtotal?: number;
  es_traslado: boolean;
  comision_pos: number;
  created_at: string;
  caja_movimientos_detalles?: MovimientoDetalle[];
}

