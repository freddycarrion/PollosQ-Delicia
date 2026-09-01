// ============================================================
// Tipos de la base de datos — Pollos Q' Delicia
// Versión: 2.0.0 — incluye RBAC
// ============================================================

export type RolUsuario    = 'admin' | 'cajero' | 'supervisor'
export type MetodoPago    = 'efectivo' | 'tarjeta' | 'qr' | 'transferencia'
export type MetodoPagoMixto = Exclude<MetodoPago, 'transferencia'> // Efectivo, Tarjeta, QR
export type EstadoVenta   = 'completada' | 'anulada' | 'pendiente'
export type EstadoTurno   = 'abierto' | 'cerrado'
export type UnidadMedida  = 'kg' | 'g' | 'litro' | 'ml' | 'unidad' | 'docena' | 'caja'
export type TipoMovimiento = 'ingreso' | 'egreso' | 'ajuste'
export type OrigenPermiso = 'override_individual' | 'heredado_rol' | 'sin_acceso'

// ============================================================
// RBAC: Roles, Permisos
// ============================================================

export interface Rol {
  id:          string
  nombre:      string          // 'admin' | 'cajero' | 'supervisor'
  descripcion: string | null
  color:       string          // color hex para badge en la UI
  es_sistema:  boolean         // si TRUE no se puede eliminar
  activo:      boolean
  created_at:  string
  updated_at:  string
  // Relaciones
  permisos?:   Permiso[]
}

export interface Permiso {
  id:          string
  clave:       string          // ej: 'ventas.ver', 'empleados.crear'
  nombre:      string
  descripcion: string | null
  modulo:      string          // ej: 'ventas', 'caja', 'reportes'
  created_at:  string
}

export interface RolPermiso {
  rol_id:     string
  permiso_id: string
  created_at: string
  // Relaciones
  rol?:     Rol
  permiso?: Permiso
}

export interface UsuarioPermiso {
  usuario_id:   string
  permiso_id:   string
  concedido:    boolean         // TRUE = concedido extra, FALSE = denegado aunque el rol lo tenga
  otorgado_por: string | null
  motivo:       string | null
  created_at:   string
  // Relaciones
  permiso?: Permiso
  otorgador?: Perfil
}

// Vista: permisos efectivos de un usuario 
export interface PermisoEfectivo {
  usuario_id:     string
  usuario:        string
  rol:            RolUsuario
  permiso_id:     string
  clave:          string
  permiso_nombre: string
  modulo:         string
  concedido:      boolean
  origen:         OrigenPermiso
}


export interface Sucursal {
  id: string
  nombre: string
  direccion: string | null
  telefono: string | null
  ciudad: string | null
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Perfil {
  id:          string
  nombre:      string
  apellido:    string
  telefono:    string | null
  avatar_url:  string | null
  rol:         RolUsuario     // enum rápido (sincronizado con rol_id)
  rol_id:      string | null  // FK a la tabla roles
  sucursal_id: string | null
  activo:      boolean
  created_at:  string
  updated_at:  string
  // Relaciones
  sucursal?:          Sucursal
  rol_objeto?:        Rol
  usuario_permisos?:  UsuarioPermiso[]
}

export interface Categoria {
  id: string
  nombre: string
  icono: string
  orden: number
  activa: boolean
  created_at: string
}

export interface Producto {
  id: string
  categoria_id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  en_oferta: boolean
  imagen_url: string | null
  disponible: boolean
  orden: number
  requiere_presas: boolean       // Si TRUE, solicita presas al agregar al POS
  created_at: string
  updated_at: string
  // Relaciones
  categoria?: Categoria
}

export interface Turno {
  id: string
  cajero_id: string
  sucursal_id: string
  monto_apertura: number
  monto_cierre: number | null
  total_efectivo: number
  total_tarjeta: number
  total_qr: number
  total_transferencia: number
  num_ventas: number
  observaciones: string | null
  estado: EstadoTurno
  fecha_apertura: string
  fecha_cierre: string | null
  created_at: string
  // Relaciones
  cajero?: Perfil
  sucursal?: Sucursal
}

export interface Venta {
  id: string
  numero_ticket: number
  turno_id: string
  cajero_id: string
  sucursal_id: string
  subtotal: number
  descuento: number
  total: number
  metodo_pago: MetodoPago
  metodo_pago_2: MetodoPago | null   // Segundo método en pago mixto
  monto_pago_2: number | null        // Monto del segundo método
  monto_recibido: number | null
  vuelto: number
  tipo_pedido: 'para_llevar' | 'en_local'
  estado: EstadoVenta
  motivo_anulacion: string | null
  anulado_por: string | null
  fecha_anulacion: string | null
  observaciones: string | null
  created_at: string
  // Relaciones
  cajero?: Perfil
  sucursal?: Sucursal
  turno?: Turno
  detalle?: DetalleVenta[]
}

export interface DetalleVenta {
  id: string
  venta_id: string
  producto_id: string
  nombre_producto: string
  precio_unitario: number
  cantidad: number
  subtotal: number
  notas_item: string | null          // Presas/acompañamientos elegidos
  created_at: string
  // Relaciones
  producto?: Producto
}

export interface Proveedor {
  id: string
  nombre: string
  contacto: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  nit: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Insumo {
  id: string
  sucursal_id: string
  nombre: string
  descripcion: string | null
  unidad: UnidadMedida
  stock_actual: number
  stock_minimo: number
  precio_referencia: number | null
  activo: boolean
  created_at: string
  updated_at: string
  // Relaciones
  sucursal?: Sucursal
}

export interface Compra {
  id: string
  sucursal_id: string
  proveedor_id: string | null
  registrado_por: string
  numero_factura: string | null
  total: number
  observaciones: string | null
  fecha_compra: string
  created_at: string
  // Relaciones
  proveedor?: Proveedor
  registrador?: Perfil
  detalle?: DetalleCompra[]
}

export interface DetalleCompra {
  id: string
  compra_id: string
  insumo_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
  // Relaciones
  insumo?: Insumo
}

export interface MovimientoCaja {
  id: string
  turno_id: string
  sucursal_id: string
  registrado_por: string
  tipo: TipoMovimiento
  monto: number
  concepto: string
  created_at: string
}

// -------- Vistas --------

export interface VentaDiaria {
  fecha: string
  sucursal_id: string
  sucursal: string
  num_ventas: number
  total_bs: number
  num_anuladas: number
  total_efectivo: number
  total_tarjeta: number
  total_qr: number
  total_transferencia: number
}

export interface ProductoMasVendido {
  producto_id: string
  nombre_producto: string
  total_unidades: number
  total_bs: number
  num_pedidos: number
}

export interface DesempenoCajero {
  cajero_id: string
  cajero: string
  sucursal_id: string
  sucursal: string
  total_ventas: number
  total_bs: number
  ticket_promedio: number
  ventas_anuladas: number
  ultima_venta: string
}

export interface CajaActual {
  turno_id: string
  sucursal_id: string
  sucursal: string
  cajero: string
  monto_apertura: number
  total_efectivo: number
  total_tarjeta: number
  total_qr: number
  total_transferencia: number
  total_ventas: number
  num_ventas: number
  estado: EstadoTurno
  fecha_apertura: string
}

export interface StockBajo {
  id: string
  sucursal_id: string
  sucursal: string
  insumo: string
  stock_actual: number
  stock_minimo: number
  unidad: UnidadMedida
  deficit: number
}
