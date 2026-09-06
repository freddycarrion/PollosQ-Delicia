-- ============================================================
--  🍗 TÍA SARITA — Schema Completo de Base de Datos
--  Supabase / PostgreSQL
--  Moneda: Bolivianos (Bs.)
--  Versión: 2.0.0  — incluye RBAC (roles, permisos, usuario_permisos)
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE rol_usuario    AS ENUM ('admin', 'cajero', 'supervisor');
CREATE TYPE metodo_pago    AS ENUM ('efectivo', 'tarjeta', 'qr', 'transferencia');
CREATE TYPE estado_venta   AS ENUM ('completada', 'anulada', 'pendiente');
CREATE TYPE estado_turno   AS ENUM ('abierto', 'cerrado');
CREATE TYPE unidad_medida  AS ENUM ('kg', 'g', 'litro', 'ml', 'unidad', 'docena', 'caja');
CREATE TYPE tipo_movimiento AS ENUM ('ingreso', 'egreso', 'ajuste');

-- ============================================================
-- 2. TABLA: sucursales
-- ============================================================

CREATE TABLE sucursales (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(100) NOT NULL,
    direccion   TEXT,
    telefono    VARCHAR(20),
    ciudad      VARCHAR(80),
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. TABLAS RBAC: roles — permisos — rol_permisos
-- ============================================================

-- 3a. roles: define los roles del negocio
CREATE TABLE roles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(80)  UNIQUE NOT NULL,       -- 'admin', 'cajero', 'supervisor'
    descripcion TEXT,
    color       VARCHAR(20)  NOT NULL DEFAULT '#6B7280', -- color de badge en la UI
    es_sistema  BOOLEAN      NOT NULL DEFAULT FALSE,    -- TRUE = no se puede eliminar
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3b. permisos: cada acción granular del sistema
CREATE TABLE permisos (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave       VARCHAR(120) UNIQUE NOT NULL,  -- ej: 'ventas.ver', 'empleados.crear'
    nombre      VARCHAR(150) NOT NULL,         -- ej: 'Ver ventas'
    descripcion TEXT,
    modulo      VARCHAR(80)  NOT NULL,         -- ej: 'ventas', 'empleados', 'caja'
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 3c. rol_permisos: qué permisos tiene cada rol (muchos a muchos)
CREATE TABLE rol_permisos (
    rol_id      UUID NOT NULL REFERENCES roles(id)    ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES permisos(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (rol_id, permiso_id)
);

-- ============================================================
-- 4. TABLA: perfiles (extiende auth.users de Supabase)
-- ============================================================

CREATE TABLE perfiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    apellido        VARCHAR(100) NOT NULL,
    telefono        VARCHAR(20),
    avatar_url      TEXT,
    -- enum para RLS rápido (se mantiene sincronizado con rol_id)
    rol             rol_usuario  NOT NULL DEFAULT 'cajero',
    -- FK al nuevo sistema de roles
    rol_id          UUID REFERENCES roles(id) ON DELETE SET NULL,
    sucursal_id     UUID REFERENCES sucursales(id) ON DELETE SET NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4a. usuario_permisos: permisos EXTRAS o DENEGADOS a un usuario específico
--     Permite casos como: "este cajero en particular SÍ puede ver reportes"
CREATE TABLE usuario_permisos (
    usuario_id  UUID NOT NULL REFERENCES perfiles(id)  ON DELETE CASCADE,
    permiso_id  UUID NOT NULL REFERENCES permisos(id)  ON DELETE CASCADE,
    -- TRUE = permiso concedido individualmente
    -- FALSE = permiso denegado aunque su rol lo tenga
    concedido   BOOLEAN     NOT NULL DEFAULT TRUE,
    otorgado_por UUID       REFERENCES perfiles(id) ON DELETE SET NULL,
    motivo      VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (usuario_id, permiso_id)
);

-- ============================================================
-- 5. TABLA: categorias
-- ============================================================

CREATE TABLE categorias (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(80) NOT NULL,
    icono       VARCHAR(20) DEFAULT '🍗',
    orden       SMALLINT    NOT NULL DEFAULT 0,
    activa      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. TABLA: productos (menú completo)
-- ============================================================

CREATE TABLE productos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id    UUID         NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    precio          NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    precio_oferta   NUMERIC(10, 2)        CHECK (precio_oferta >= 0),
    en_oferta       BOOLEAN      NOT NULL DEFAULT FALSE,
    imagen_url      TEXT,
    disponible      BOOLEAN      NOT NULL DEFAULT TRUE,
    orden           SMALLINT     NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 7. TABLA: turnos (apertura/cierre de caja)
-- ============================================================

CREATE TABLE turnos (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cajero_id           UUID         NOT NULL REFERENCES perfiles(id)   ON DELETE RESTRICT,
    sucursal_id         UUID         NOT NULL REFERENCES sucursales(id)  ON DELETE RESTRICT,
    monto_apertura      NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (monto_apertura >= 0),
    monto_cierre        NUMERIC(10, 2)        CHECK (monto_cierre >= 0),
    total_efectivo      NUMERIC(10, 2) DEFAULT 0,
    total_tarjeta       NUMERIC(10, 2) DEFAULT 0,
    total_qr            NUMERIC(10, 2) DEFAULT 0,
    total_transferencia NUMERIC(10, 2) DEFAULT 0,
    num_ventas          INTEGER        DEFAULT 0,
    observaciones       TEXT,
    estado              estado_turno  NOT NULL DEFAULT 'abierto',
    fecha_apertura      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    fecha_cierre        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TABLA: ventas
-- ============================================================

CREATE TABLE ventas (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero_ticket    SERIAL,
    turno_id         UUID          NOT NULL REFERENCES turnos(id)     ON DELETE RESTRICT,
    cajero_id        UUID          NOT NULL REFERENCES perfiles(id)   ON DELETE RESTRICT,
    sucursal_id      UUID          NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    descuento        NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total            NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    metodo_pago      metodo_pago   NOT NULL DEFAULT 'efectivo',
    monto_recibido   NUMERIC(10, 2),
    vuelto           NUMERIC(10, 2) DEFAULT 0,
    tipo_pedido      VARCHAR(20)    DEFAULT 'para_llevar',
    estado           estado_venta  NOT NULL DEFAULT 'completada',
    motivo_anulacion TEXT,
    anulado_por      UUID          REFERENCES perfiles(id),
    fecha_anulacion  TIMESTAMPTZ,
    observaciones    TEXT,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 9. TABLA: detalle_ventas
-- ============================================================

CREATE TABLE detalle_ventas (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id        UUID           NOT NULL REFERENCES ventas(id)    ON DELETE CASCADE,
    producto_id     UUID                    REFERENCES productos(id)  ON DELETE SET NULL,
    nombre_producto VARCHAR(150)   NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    cantidad        SMALLINT       NOT NULL CHECK (cantidad > 0),
    subtotal        NUMERIC(10, 2) NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10. TABLA: proveedores
-- ============================================================

CREATE TABLE proveedores (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre      VARCHAR(150) NOT NULL,
    contacto    VARCHAR(100),
    telefono    VARCHAR(20),
    email       VARCHAR(150),
    direccion   TEXT,
    nit         VARCHAR(20),
    activo      BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11. TABLA: insumos
-- ============================================================

CREATE TABLE insumos (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id       UUID           NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    nombre            VARCHAR(150)   NOT NULL,
    descripcion       TEXT,
    unidad            unidad_medida  NOT NULL DEFAULT 'unidad',
    stock_actual      NUMERIC(12, 3) NOT NULL DEFAULT 0,
    stock_minimo      NUMERIC(12, 3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
    precio_referencia NUMERIC(10, 2),
    activo            BOOLEAN        NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 12. TABLA: compras
-- ============================================================

CREATE TABLE compras (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id     UUID          NOT NULL REFERENCES sucursales(id)  ON DELETE RESTRICT,
    proveedor_id    UUID                   REFERENCES proveedores(id) ON DELETE SET NULL,
    registrado_por  UUID          NOT NULL REFERENCES perfiles(id)    ON DELETE RESTRICT,
    numero_factura  VARCHAR(50),
    total           NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    observaciones   TEXT,
    fecha_compra    DATE          NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 13. TABLA: detalle_compras
-- ============================================================

CREATE TABLE detalle_compras (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    compra_id       UUID           NOT NULL REFERENCES compras(id)  ON DELETE CASCADE,
    insumo_id       UUID           NOT NULL REFERENCES insumos(id)  ON DELETE RESTRICT,
    cantidad        NUMERIC(12, 3) NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    subtotal        NUMERIC(10, 2) NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 14. TABLA: movimientos_caja
-- ============================================================

CREATE TABLE movimientos_caja (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    turno_id        UUID          NOT NULL REFERENCES turnos(id)     ON DELETE RESTRICT,
    sucursal_id     UUID          NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
    registrado_por  UUID          NOT NULL REFERENCES perfiles(id)   ON DELETE RESTRICT,
    tipo            tipo_movimiento NOT NULL,
    monto           NUMERIC(10, 2) NOT NULL,
    concepto        VARCHAR(200)   NOT NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 15. TABLA: configuracion_sistema
-- ============================================================

CREATE TABLE configuracion_sistema (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clave       VARCHAR(80) UNIQUE NOT NULL,
    valor       TEXT        NOT NULL,
    descripcion TEXT,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES DE RENDIMIENTO
-- ============================================================

CREATE INDEX idx_ventas_cajero_id         ON ventas(cajero_id);
CREATE INDEX idx_ventas_turno_id          ON ventas(turno_id);
CREATE INDEX idx_ventas_sucursal_id       ON ventas(sucursal_id);
CREATE INDEX idx_ventas_created_at        ON ventas(created_at DESC);
CREATE INDEX idx_ventas_estado            ON ventas(estado);
CREATE INDEX idx_detalle_ventas_venta     ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_ventas_producto  ON detalle_ventas(producto_id);
CREATE INDEX idx_turnos_cajero_id         ON turnos(cajero_id);
CREATE INDEX idx_turnos_sucursal_id       ON turnos(sucursal_id);
CREATE INDEX idx_turnos_estado            ON turnos(estado);
CREATE INDEX idx_insumos_sucursal_id      ON insumos(sucursal_id);
CREATE INDEX idx_compras_sucursal_id      ON compras(sucursal_id);
CREATE INDEX idx_compras_fecha            ON compras(fecha_compra DESC);
CREATE INDEX idx_perfiles_rol             ON perfiles(rol);
CREATE INDEX idx_perfiles_rol_id          ON perfiles(rol_id);
CREATE INDEX idx_perfiles_sucursal_id     ON perfiles(sucursal_id);
CREATE INDEX idx_productos_categoria_id   ON productos(categoria_id);
CREATE INDEX idx_productos_disponible     ON productos(disponible);
CREATE INDEX idx_rol_permisos_rol         ON rol_permisos(rol_id);
CREATE INDEX idx_rol_permisos_permiso     ON rol_permisos(permiso_id);
CREATE INDEX idx_usuario_permisos_usuario ON usuario_permisos(usuario_id);
CREATE INDEX idx_permisos_modulo          ON permisos(modulo);
CREATE INDEX idx_permisos_clave           ON permisos(clave);

-- ============================================================
-- TRIGGERS — updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sucursales_updated_at
    BEFORE UPDATE ON sucursales
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_perfiles_updated_at
    BEFORE UPDATE ON perfiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_productos_updated_at
    BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_insumos_updated_at
    BEFORE UPDATE ON insumos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
    BEFORE UPDATE ON proveedores
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER — crear perfil automáticamente al registrar usuario
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_rol_id UUID;
    v_rol    rol_usuario;
BEGIN
    -- Obtener el rol del metadata o usar 'cajero' por defecto
    v_rol := COALESCE((NEW.raw_user_meta_data->>'rol')::rol_usuario, 'cajero');

    -- Buscar el UUID del rol correspondiente en la tabla roles
    SELECT id INTO v_rol_id FROM public.roles WHERE nombre = v_rol::TEXT LIMIT 1;

    INSERT INTO public.perfiles (id, nombre, apellido, rol, rol_id)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'apellido', ''),
        v_rol,
        v_rol_id
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- TRIGGER — sincronizar rol (enum) cuando cambia rol_id
-- ============================================================

CREATE OR REPLACE FUNCTION sincronizar_rol_enum()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_nombre_rol TEXT;
BEGIN
    IF NEW.rol_id IS NOT NULL AND NEW.rol_id IS DISTINCT FROM OLD.rol_id THEN
        SELECT nombre INTO v_nombre_rol FROM public.roles WHERE id = NEW.rol_id;
        -- Solo actualizar si el nombre coincide con los valores del enum
        IF v_nombre_rol IN ('admin', 'cajero', 'supervisor') THEN
            NEW.rol := v_nombre_rol::rol_usuario;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sincronizar_rol_enum
    BEFORE UPDATE OF rol_id ON perfiles
    FOR EACH ROW EXECUTE FUNCTION sincronizar_rol_enum();

-- ============================================================
-- TRIGGER — actualizar totales del turno al completar una venta
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_totales_turno()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF NEW.estado = 'completada' THEN
        UPDATE turnos SET
            total_efectivo      = CASE WHEN NEW.metodo_pago = 'efectivo'      THEN total_efectivo + NEW.total      ELSE total_efectivo      END,
            total_tarjeta       = CASE WHEN NEW.metodo_pago = 'tarjeta'       THEN total_tarjeta + NEW.total       ELSE total_tarjeta       END,
            total_qr            = CASE WHEN NEW.metodo_pago = 'qr'            THEN total_qr + NEW.total            ELSE total_qr            END,
            total_transferencia = CASE WHEN NEW.metodo_pago = 'transferencia' THEN total_transferencia + NEW.total ELSE total_transferencia END,
            num_ventas          = num_ventas + 1
        WHERE id = NEW.turno_id;
    END IF;

    IF OLD IS NOT NULL AND OLD.estado = 'completada' AND NEW.estado = 'anulada' THEN
        UPDATE turnos SET
            total_efectivo      = CASE WHEN OLD.metodo_pago = 'efectivo'      THEN total_efectivo - OLD.total      ELSE total_efectivo      END,
            total_tarjeta       = CASE WHEN OLD.metodo_pago = 'tarjeta'       THEN total_tarjeta - OLD.total       ELSE total_tarjeta       END,
            total_qr            = CASE WHEN OLD.metodo_pago = 'qr'            THEN total_qr - OLD.total            ELSE total_qr            END,
            total_transferencia = CASE WHEN OLD.metodo_pago = 'transferencia' THEN total_transferencia - OLD.total ELSE total_transferencia END,
            num_ventas          = GREATEST(num_ventas - 1, 0)
        WHERE id = OLD.turno_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_actualizar_turno_en_venta
    AFTER INSERT OR UPDATE OF estado ON ventas
    FOR EACH ROW EXECUTE FUNCTION actualizar_totales_turno();

-- ============================================================
-- TRIGGER — actualizar stock al registrar compras
-- ============================================================

CREATE OR REPLACE FUNCTION actualizar_stock_insumo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE insumos
    SET stock_actual = stock_actual + NEW.cantidad,
        updated_at   = NOW()
    WHERE id = NEW.insumo_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_stock_al_comprar
    AFTER INSERT ON detalle_compras
    FOR EACH ROW EXECUTE FUNCTION actualizar_stock_insumo();

-- ============================================================
-- FUNCIONES HELPER — RBAC
-- ============================================================

-- Retorna el rol enum del usuario actual (para RLS rápido)
CREATE OR REPLACE FUNCTION get_my_rol()
RETURNS rol_usuario LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$;

-- Retorna el rol_id del usuario actual
CREATE OR REPLACE FUNCTION get_my_rol_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT rol_id FROM public.perfiles WHERE id = auth.uid();
$$;

-- Retorna la sucursal del usuario actual
CREATE OR REPLACE FUNCTION get_my_sucursal()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT sucursal_id FROM public.perfiles WHERE id = auth.uid();
$$;

-- Verifica si el usuario tiene un permiso específico (por clave)
-- Prioridad: usuario_permisos > rol_permisos
CREATE OR REPLACE FUNCTION tiene_permiso(p_clave VARCHAR)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
    v_concedido      BOOLEAN;
    v_permiso_id     UUID;
    v_rol_id         UUID;
    v_tiene_en_rol   BOOLEAN;
BEGIN
    -- Obtener el ID del permiso
    SELECT id INTO v_permiso_id FROM public.permisos WHERE clave = p_clave;
    IF v_permiso_id IS NULL THEN RETURN FALSE; END IF;

    -- 1. Verificar override individual (usuario_permisos) — tiene prioridad
    SELECT concedido INTO v_concedido
    FROM public.usuario_permisos
    WHERE usuario_id = auth.uid() AND permiso_id = v_permiso_id;

    IF FOUND THEN
        RETURN v_concedido;  -- respeta el override (TRUE o FALSE)
    END IF;

    -- 2. Verificar por rol del usuario
    SELECT rol_id INTO v_rol_id FROM public.perfiles WHERE id = auth.uid();
    IF v_rol_id IS NULL THEN RETURN FALSE; END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.rol_permisos
        WHERE rol_id = v_rol_id AND permiso_id = v_permiso_id
    ) INTO v_tiene_en_rol;

    RETURN v_tiene_en_rol;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE roles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisos            ENABLE ROW LEVEL SECURITY;
ALTER TABLE rol_permisos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_permisos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_ventas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias          ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos             ENABLE ROW LEVEL SECURITY;
ALTER TABLE compras             ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_compras     ENABLE ROW LEVEL SECURITY;
ALTER TABLE proveedores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sucursales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_caja    ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- -------- POLÍTICAS: roles --------
CREATE POLICY "roles_todos_leen"     ON roles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "roles_admin_escribe"  ON roles FOR ALL    USING (get_my_rol() = 'admin');

-- -------- POLÍTICAS: permisos --------
CREATE POLICY "permisos_todos_leen"    ON permisos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "permisos_admin_escribe" ON permisos FOR ALL    USING (get_my_rol() = 'admin');

-- -------- POLÍTICAS: rol_permisos --------
CREATE POLICY "rol_permisos_todos_leen"    ON rol_permisos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rol_permisos_admin_escribe" ON rol_permisos FOR ALL    USING (get_my_rol() = 'admin');

-- -------- POLÍTICAS: usuario_permisos --------
-- El usuario puede ver sus propios overrides
CREATE POLICY "usuario_permisos_ver_propio" ON usuario_permisos
    FOR SELECT USING (usuario_id = auth.uid());
-- Admin puede ver y gestionar todos
CREATE POLICY "usuario_permisos_admin"      ON usuario_permisos
    FOR ALL USING (get_my_rol() = 'admin');

-- -------- POLÍTICAS: perfiles --------
CREATE POLICY "perfil_ver_propio"      ON perfiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "perfil_admin_ver_todos" ON perfiles FOR SELECT USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND (sucursal_id = get_my_sucursal() OR sucursal_id IS NULL))
);
CREATE POLICY "perfil_admin_gestionar" ON perfiles FOR ALL    USING (get_my_rol() = 'admin');
CREATE POLICY "perfil_actualizar_propio" ON perfiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND rol = (SELECT rol FROM perfiles WHERE id = auth.uid()));

-- -------- POLÍTICAS: sucursales --------
CREATE POLICY "sucursal_todos_leen"        ON sucursales FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "sucursal_solo_admin_escribe" ON sucursales FOR ALL   USING (get_my_rol() = 'admin');

-- -------- POLÍTICAS: categorias --------
CREATE POLICY "categoria_todos_leen"   ON categorias FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "categoria_admin_escribe" ON categorias FOR ALL   USING (
    get_my_rol() = 'admin' OR get_my_rol() = 'supervisor'
);

-- -------- POLÍTICAS: productos --------
CREATE POLICY "producto_todos_leen"    ON productos FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "producto_admin_escribe" ON productos FOR ALL    USING (
    get_my_rol() = 'admin' OR get_my_rol() = 'supervisor'
);

-- -------- POLÍTICAS: turnos --------
CREATE POLICY "turno_cajero_ver_propio" ON turnos FOR SELECT USING (cajero_id = auth.uid());
CREATE POLICY "turno_admin_ver_all"     ON turnos FOR SELECT USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);
CREATE POLICY "turno_insertar"          ON turnos FOR INSERT  WITH CHECK (
    cajero_id = auth.uid() OR get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);
CREATE POLICY "turno_actualizar"        ON turnos FOR UPDATE  USING (
    cajero_id = auth.uid() OR get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);

-- -------- POLÍTICAS: ventas --------
CREATE POLICY "venta_cajero_ver_propias" ON ventas FOR SELECT USING (cajero_id = auth.uid());
CREATE POLICY "venta_admin_ver_todas"    ON ventas FOR SELECT USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);
CREATE POLICY "venta_insertar"           ON ventas FOR INSERT  WITH CHECK (cajero_id = auth.uid());
CREATE POLICY "venta_admin_anular"       ON ventas FOR UPDATE  USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);

-- -------- POLÍTICAS: detalle_ventas --------
CREATE POLICY "detalle_venta_ver" ON detalle_ventas
    FOR SELECT USING (
        get_my_rol() = 'admin' 
        OR (get_my_rol() = 'supervisor' AND EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.sucursal_id = get_my_sucursal()))
        OR EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.cajero_id = auth.uid())
    );
CREATE POLICY "detalle_venta_insertar" ON detalle_ventas
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM ventas v WHERE v.id = venta_id AND v.cajero_id = auth.uid())
    );

-- -------- POLÍTICAS: insumos --------
CREATE POLICY "insumo_ver"           ON insumos FOR SELECT USING (
    get_my_rol() = 'admin' OR sucursal_id = get_my_sucursal()
);
CREATE POLICY "insumo_admin_escribe" ON insumos FOR ALL    USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);

-- -------- POLÍTICAS: compras --------
CREATE POLICY "compra_ver"      ON compras FOR SELECT USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);
CREATE POLICY "compra_insertar" ON compras FOR INSERT  WITH CHECK (
    registrado_por = auth.uid() AND (get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal()))
);

-- -------- POLÍTICAS: detalle_compras --------
CREATE POLICY "detalle_compra_ver"      ON detalle_compras FOR SELECT USING (
    get_my_rol() = 'admin' 
    OR (get_my_rol() = 'supervisor' AND EXISTS (SELECT 1 FROM compras c WHERE c.id = compra_id AND c.sucursal_id = get_my_sucursal()))
);
CREATE POLICY "detalle_compra_insertar" ON detalle_compras FOR INSERT  WITH CHECK (
    get_my_rol() = 'admin' 
    OR (get_my_rol() = 'supervisor' AND EXISTS (SELECT 1 FROM compras c WHERE c.id = compra_id AND c.sucursal_id = get_my_sucursal()))
);

-- -------- POLÍTICAS: proveedores --------
CREATE POLICY "proveedor_ver"           ON proveedores FOR SELECT USING (get_my_rol() IN ('admin', 'supervisor'));
CREATE POLICY "proveedor_admin_escribe" ON proveedores FOR ALL    USING (get_my_rol() IN ('admin', 'supervisor'));

-- -------- POLÍTICAS: movimientos_caja --------
CREATE POLICY "movimiento_ver"      ON movimientos_caja FOR SELECT USING (
    get_my_rol() = 'admin' OR (get_my_rol() = 'supervisor' AND sucursal_id = get_my_sucursal())
);
CREATE POLICY "movimiento_insertar" ON movimientos_caja FOR INSERT  WITH CHECK (
    registrado_por = auth.uid()
);

-- -------- POLÍTICAS: configuracion_sistema --------
CREATE POLICY "config_ver"           ON configuracion_sistema FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "config_admin_escribe" ON configuracion_sistema FOR ALL    USING (get_my_rol() = 'admin');

-- ============================================================
-- VISTAS DE REPORTES
-- ============================================================

CREATE OR REPLACE VIEW vista_ventas_diarias WITH (security_invoker = true) AS
SELECT
    DATE(v.created_at)   AS fecha,
    v.sucursal_id,
    s.nombre             AS sucursal,
    COUNT(v.id)          AS num_ventas,
    SUM(CASE WHEN v.estado = 'completada' THEN v.total ELSE 0 END)                         AS total_bs,
    SUM(CASE WHEN v.estado = 'anulada'    THEN 1        ELSE 0 END)                        AS num_anuladas,
    SUM(CASE WHEN v.metodo_pago = 'efectivo'      AND v.estado = 'completada' THEN v.total ELSE 0 END) AS total_efectivo,
    SUM(CASE WHEN v.metodo_pago = 'tarjeta'       AND v.estado = 'completada' THEN v.total ELSE 0 END) AS total_tarjeta,
    SUM(CASE WHEN v.metodo_pago = 'qr'            AND v.estado = 'completada' THEN v.total ELSE 0 END) AS total_qr,
    SUM(CASE WHEN v.metodo_pago = 'transferencia' AND v.estado = 'completada' THEN v.total ELSE 0 END) AS total_transferencia
FROM ventas v
JOIN sucursales s ON s.id = v.sucursal_id
GROUP BY DATE(v.created_at), v.sucursal_id, s.nombre;

CREATE OR REPLACE VIEW vista_productos_mas_vendidos WITH (security_invoker = true) AS
SELECT
    dv.producto_id,
    dv.nombre_producto,
    SUM(dv.cantidad)          AS total_unidades,
    SUM(dv.subtotal)          AS total_bs,
    COUNT(DISTINCT dv.venta_id) AS num_pedidos
FROM detalle_ventas dv
JOIN ventas v ON v.id = dv.venta_id
WHERE v.estado = 'completada'
GROUP BY dv.producto_id, dv.nombre_producto
ORDER BY total_unidades DESC;

CREATE OR REPLACE VIEW vista_desempeno_cajeros WITH (security_invoker = true) AS
SELECT
    p.id                   AS cajero_id,
    p.nombre || ' ' || p.apellido AS cajero,
    p.sucursal_id,
    s.nombre               AS sucursal,
    COUNT(v.id)            AS total_ventas,
    SUM(CASE WHEN v.estado = 'completada' THEN v.total ELSE 0 END) AS total_bs,
    ROUND(AVG(CASE WHEN v.estado = 'completada' THEN v.total END), 2) AS ticket_promedio,
    COUNT(CASE WHEN v.estado = 'anulada' THEN 1 END) AS ventas_anuladas,
    DATE(MAX(v.created_at)) AS ultima_venta
FROM perfiles p
LEFT JOIN ventas v ON v.cajero_id = p.id
LEFT JOIN sucursales s ON s.id = p.sucursal_id
WHERE p.rol = 'cajero'
GROUP BY p.id, p.nombre, p.apellido, p.sucursal_id, s.nombre;

CREATE OR REPLACE VIEW vista_caja_actual WITH (security_invoker = true) AS
SELECT
    t.id            AS turno_id,
    t.sucursal_id,
    s.nombre        AS sucursal,
    p.nombre || ' ' || p.apellido AS cajero,
    t.monto_apertura,
    t.total_efectivo,
    t.total_tarjeta,
    t.total_qr,
    t.total_transferencia,
    (t.total_efectivo + t.total_tarjeta + t.total_qr + t.total_transferencia) AS total_ventas,
    t.num_ventas,
    t.estado,
    t.fecha_apertura
FROM turnos t
JOIN sucursales s ON s.id = t.sucursal_id
JOIN perfiles p   ON p.id = t.cajero_id
WHERE t.estado = 'abierto';

CREATE OR REPLACE VIEW vista_stock_bajo WITH (security_invoker = true) AS
SELECT
    i.id,
    i.sucursal_id,
    s.nombre    AS sucursal,
    i.nombre    AS insumo,
    i.stock_actual,
    i.stock_minimo,
    i.unidad,
    (i.stock_minimo - i.stock_actual) AS deficit
FROM insumos i
JOIN sucursales s ON s.id = i.sucursal_id
WHERE i.stock_actual <= i.stock_minimo AND i.activo = TRUE
ORDER BY deficit DESC;

-- Vista: Permisos efectivos de un usuario (rol + overrides)
CREATE OR REPLACE VIEW vista_permisos_usuario WITH (security_invoker = true) AS
SELECT
    p.id                AS usuario_id,
    p.nombre || ' ' || p.apellido AS usuario,
    p.rol,
    per.id              AS permiso_id,
    per.clave,
    per.nombre          AS permiso_nombre,
    per.modulo,
    CASE
        WHEN up.usuario_id IS NOT NULL THEN up.concedido   -- override individual
        WHEN rp.rol_id     IS NOT NULL THEN TRUE           -- heredado del rol
        ELSE FALSE
    END AS concedido,
    CASE
        WHEN up.usuario_id IS NOT NULL THEN 'override_individual'
        WHEN rp.rol_id     IS NOT NULL THEN 'heredado_rol'
        ELSE 'sin_acceso'
    END AS origen
FROM perfiles p
CROSS JOIN permisos per
LEFT JOIN rol_permisos  rp ON rp.rol_id     = p.rol_id  AND rp.permiso_id = per.id
LEFT JOIN usuario_permisos up ON up.usuario_id = p.id   AND up.permiso_id = per.id;

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Sucursal principal
INSERT INTO sucursales (nombre, direccion, ciudad, telefono) VALUES
('Tía Sarita — Principal', 'Av. Principal #123', 'Santa Cruz de la Sierra', '+591 77777777');

-- -------- ROLES del sistema --------
INSERT INTO roles (nombre, descripcion, color, es_sistema) VALUES
('admin',      'Administrador general. Acceso total al sistema.',                          '#D32F2F', TRUE),
('supervisor', 'Supervisa turnos, reportes y empleados. No puede gestionar configuración.','#F57F17', TRUE),
('cajero',     'Operador de punto de venta. Solo puede realizar ventas.',                  '#1565C0', TRUE);

-- -------- PERMISOS granulares --------
INSERT INTO permisos (clave, nombre, modulo) VALUES
-- Módulo: dashboard
('dashboard.ver',               'Ver dashboard principal',                  'dashboard'),
-- Módulo: ventas
('ventas.ver',                  'Ver ventas',                               'ventas'),
('ventas.crear',                'Registrar nueva venta',                    'ventas'),
('ventas.anular',               'Anular una venta',                         'ventas'),
('ventas.exportar',             'Exportar ventas a PDF/Excel',              'ventas'),
-- Módulo: caja
('caja.ver',                    'Ver estado de caja',                       'caja'),
('caja.abrir',                  'Abrir turno de caja',                      'caja'),
('caja.cerrar',                 'Cerrar turno de caja',                     'caja'),
('caja.movimientos',            'Registrar ingresos/egresos de caja',       'caja'),
('caja.exportar',               'Exportar reporte de caja',                 'caja'),
-- Módulo: empleados
('empleados.ver',               'Ver lista de empleados',                   'empleados'),
('empleados.crear',             'Crear nuevo empleado',                     'empleados'),
('empleados.editar',            'Editar datos de empleado',                 'empleados'),
('empleados.desactivar',        'Activar/desactivar empleado',              'empleados'),
('empleados.ver_desempeno',     'Ver desempeño y estadísticas de cajeros',  'empleados'),
('empleados.gestionar_permisos','Gestionar permisos individuales',          'empleados'),
-- Módulo: productos (menú)
('productos.ver',               'Ver productos del menú',                   'productos'),
('productos.crear',             'Agregar nuevo producto',                   'productos'),
('productos.editar',            'Editar producto existente',                'productos'),
('productos.eliminar',          'Eliminar producto',                        'productos'),
('productos.toggle',            'Activar/desactivar producto',              'productos'),
-- Módulo: categorias
('categorias.ver',              'Ver categorías',                           'categorias'),
('categorias.gestionar',        'Crear y editar categorías',                'categorias'),
-- Módulo: inventario
('inventario.ver',              'Ver inventario de insumos',                'inventario'),
('inventario.gestionar',        'Crear y editar insumos',                   'inventario'),
('inventario.alertas',          'Ver alertas de stock bajo',                'inventario'),
-- Módulo: compras
('compras.ver',                 'Ver historial de compras',                 'compras'),
('compras.crear',               'Registrar nueva compra',                   'compras'),
('compras.exportar',            'Exportar reporte de compras',              'compras'),
-- Módulo: proveedores
('proveedores.ver',             'Ver proveedores',                          'proveedores'),
('proveedores.gestionar',       'Crear y editar proveedores',               'proveedores'),
-- Módulo: reportes
('reportes.ventas',             'Ver reportes de ventas',                   'reportes'),
('reportes.compras',            'Ver reportes de compras',                  'reportes'),
('reportes.cajeros',            'Ver reportes de desempeño por cajero',     'reportes'),
('reportes.exportar',           'Exportar cualquier reporte',               'reportes'),
-- Módulo: sucursales
('sucursales.ver',              'Ver sucursales',                           'sucursales'),
('sucursales.gestionar',        'Crear y editar sucursales',                'sucursales'),
-- Módulo: configuracion
('configuracion.ver',           'Ver configuración del sistema',            'configuracion'),
('configuracion.editar',        'Editar configuración del sistema',         'configuracion'),
-- Módulo: roles
('roles.ver',                   'Ver roles y permisos',                     'roles'),
('roles.gestionar',             'Crear y editar roles y permisos',          'roles');

-- -------- ASIGNAR PERMISOS A ROLES --------

-- ADMIN: todos los permisos
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'admin';

-- SUPERVISOR: permisos amplios excepto configuración, roles y eliminación
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'supervisor'
  AND p.clave NOT IN (
    'configuracion.editar',
    'roles.gestionar',
    'empleados.gestionar_permisos',
    'sucursales.gestionar',
    'productos.eliminar'
  );

-- CAJERO: solo lo mínimo para vender
INSERT INTO rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM roles r, permisos p
WHERE r.nombre = 'cajero'
  AND p.clave IN (
    'ventas.ver',
    'ventas.crear',
    'productos.ver',
    'categorias.ver',
    'caja.abrir',
    'caja.cerrar'
  );

-- Categorías del menú
INSERT INTO categorias (nombre, icono, orden) VALUES
('Pollos Enteros',    '🐔', 1),
('Cuartos y Medios', '🍗', 2),
('Combos',           '🎁', 3),
('Complementos',     '🍟', 4),
('Bebidas',          '🥤', 5),
('Postres',          '🍮', 6);

-- Configuración del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('moneda',              'Bs.',                       'Símbolo de moneda'),
('nombre_restaurante',  'Tía Sarita',                'Nombre del restaurante'),
('nit',                 '0000000',                   'NIT del restaurante'),
('ciudad',              'Santa Cruz de la Sierra',   'Ciudad principal'),
('telefono',            '+591 77777777',             'Teléfono de contacto'),
('mensaje_ticket',      'Sabor que une familias 🍗', 'Mensaje al pie del ticket'),
('iva_porcentaje',      '13',                        'Porcentaje de IVA Bolivia');

-- ============================================================
-- 16. TABLA: comunicados
--     Avisos que el admin publica hacia el personal operativo.
--     Se ven en el Portal del empleado y en el ComunicadosBell del POS.
-- ============================================================

CREATE TABLE IF NOT EXISTS comunicados (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo        VARCHAR(200) NOT NULL,
    mensaje       TEXT         NOT NULL,
    roles_destino TEXT[]       NOT NULL DEFAULT '{}',  -- vacío = todos, o ej: '{"cajero","mesero"}'
    creador_id    UUID         REFERENCES perfiles(id) ON DELETE SET NULL,
    fecha         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comunicados_fecha      ON comunicados(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_created_at ON comunicados(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comunicados_creador    ON comunicados(creador_id);

-- RLS
ALTER TABLE comunicados ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden leer comunicados
CREATE POLICY "comunicados_todos_leen"
  ON comunicados FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo admin y supervisor pueden crear/editar/eliminar
CREATE POLICY "comunicados_admin_escribe"
  ON comunicados FOR ALL
  USING (get_my_rol() IN ('admin', 'supervisor'));

-- Realtime habilitado para comunicados en vivo (POS y Portal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'comunicados'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE comunicados;
  END IF;
END $$;

-- ============================================================
-- 17. TABLA: bitacora_asistencia
--     Registro de entrada y salida del personal operativo.
--     El empleado lo marca desde su Portal. El admin lo ve en /admin/asistencia.
-- ============================================================

CREATE TABLE IF NOT EXISTS bitacora_asistencia (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empleado_id   UUID         NOT NULL REFERENCES perfiles(id)   ON DELETE CASCADE,
    sucursal_id   UUID                  REFERENCES sucursales(id)  ON DELETE SET NULL,
    fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
    hora_entrada  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    hora_salida   TIMESTAMPTZ,          -- NULL mientras el turno sigue abierto
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    -- Un empleado solo puede tener un registro por día
    CONSTRAINT uq_bitacora_empleado_fecha UNIQUE (empleado_id, fecha)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_bitacora_empleado_id ON bitacora_asistencia(empleado_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha       ON bitacora_asistencia(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_bitacora_sucursal_id ON bitacora_asistencia(sucursal_id);

-- RLS
ALTER TABLE bitacora_asistencia ENABLE ROW LEVEL SECURITY;

-- El empleado puede ver y registrar su propio registro de hoy
CREATE POLICY "bitacora_ver_propio"
  ON bitacora_asistencia FOR SELECT
  USING (empleado_id = auth.uid());

CREATE POLICY "bitacora_insertar_propio"
  ON bitacora_asistencia FOR INSERT
  WITH CHECK (empleado_id = auth.uid());

CREATE POLICY "bitacora_actualizar_propio"
  ON bitacora_asistencia FOR UPDATE
  USING (empleado_id = auth.uid());

-- Admin y supervisor pueden ver todos los registros
CREATE POLICY "bitacora_admin_ver_todos"
  ON bitacora_asistencia FOR SELECT
  USING (get_my_rol() IN ('admin', 'supervisor'));

-- ============================================================
-- 18. TABLA: notificaciones
--     Alertas en tiempo real que el personal envía al admin
--     (apertura de turno, marcación de asistencia, etc.)
--     NOTA: También existe en setup_notificaciones.sql — este bloque
--     usa IF NOT EXISTS para evitar duplicados.
-- ============================================================

CREATE TABLE IF NOT EXISTS notificaciones (
    id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_origen_id UUID        NOT NULL REFERENCES perfiles(id) ON DELETE CASCADE,
    rol_origen        VARCHAR(50) NOT NULL,
    mensaje           TEXT        NOT NULL,
    tipo              VARCHAR(50) NOT NULL DEFAULT 'sistema',
    leido             BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_leido      ON notificaciones(leido);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at ON notificaciones(created_at DESC);

-- RLS (políticas con DROP IF EXISTS para evitar conflicto con setup_notificaciones.sql)
ALTER TABLE notificaciones ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones' AND policyname = 'notif_admin_ver_todas'
  ) THEN
    EXECUTE 'CREATE POLICY notif_admin_ver_todas ON notificaciones FOR SELECT USING (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN (''admin'', ''supervisor''))
    )';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones' AND policyname = 'notif_usuario_insertar'
  ) THEN
    EXECUTE 'CREATE POLICY notif_usuario_insertar ON notificaciones FOR INSERT WITH CHECK (auth.uid() = usuario_origen_id)';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notificaciones' AND policyname = 'notif_admin_actualizar'
  ) THEN
    EXECUTE 'CREATE POLICY notif_admin_actualizar ON notificaciones FOR UPDATE USING (
      EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN (''admin'', ''supervisor''))
    )';
  END IF;
END $$;

-- Realtime para notificaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notificaciones;
  END IF;
END $$;

