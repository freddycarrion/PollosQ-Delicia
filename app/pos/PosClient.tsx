"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Search,
  ShoppingCart,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";
import CobroModal, { ConfirmarVentaPayload, TipoVenta } from "./CobroModal";
import TicketVenta, { TicketData } from "./TicketVenta";
import PresasModal, { SeleccionPremiun, formatearNotas } from "./PresasModal";
import PedidosTab from "./PedidosTab";

interface Categoria {
  id: string;
  nombre: string;
  icono: string;
}

interface Producto {
  id: string;
  categoria_id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_oferta: number | null;
  en_oferta: boolean;
  imagen_url: string | null;
  disponible: boolean;
  requiere_presas: boolean;
}

interface ItemPedido {
  producto: Producto;
  cantidad: number;
  subtotal: number;
  notas?: string;           // Presas y acompañamientos seleccionados
  itemKey: string;          // Clave única: producto.id + notas (para diferenciar mismos prod con distintas presas)
}

interface Props {
  categorias: Categoria[];
  productos: Producto[];
  turnoId: string;
  cajeroId: string;
  cajeroNombre: string;
  sucursalId: string;
  sucursalNombre: string;
}

export default function PosClient({
  categorias,
  productos,
  turnoId,
  cajeroId,
  cajeroNombre,
  sucursalId,
  sucursalNombre,
}: Props) {
  const [categoriaActiva, setCategoriaActiva] = useState<string>(
    categorias[0]?.id || "",
  );
  const [busqueda, setBusqueda] = useState("");
  const [pedido, setPedido] = useState<ItemPedido[]>([]);
  const [tabActivo, setTabActivo] = useState<'catalogo' | 'carrito' | 'pedidos'>('catalogo');

  const supabase = createClient();

  // Ref para la barra de categorías
  const catBarRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = catBarRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    const el = catBarRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [checkScroll])

  // Scroll con rueda del mouse en la barra de categorías
  const handleCatWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (catBarRef.current) {
      e.preventDefault()
      catBarRef.current.scrollLeft += e.deltaY
    }
  }, [])

  const scrollCats = (dir: 'left' | 'right') => {
    if (catBarRef.current) {
      catBarRef.current.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' })
    }
  }

  // Modal de cobro
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal de cancelar pedido
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // Modal de selección de presas
  const [presasModalProducto, setPresasModalProducto] = useState<Producto | null>(null);

  // Ticket Data (para imprimir)
  const [ticketData, setTicketData] = useState<TicketData | null>(null);

  // Filtrado de productos
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchCat = busqueda ? true : p.categoria_id === categoriaActiva;
      const matchBusqueda = p.nombre
        .toLowerCase()
        .includes(busqueda.toLowerCase());
      return p.disponible && matchCat && matchBusqueda;
    });
  }, [productos, categoriaActiva, busqueda]);

  // Total del pedido
  const totalPedido = useMemo(() => {
    return pedido.reduce((acc, item) => acc + item.subtotal, 0);
  }, [pedido]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-BO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const getPrecioUnitario = (producto: Producto) =>
    producto.en_oferta && producto.precio_oferta
      ? producto.precio_oferta
      : producto.precio;

  // ── Agregar al pedido ─────────────────────────────────────────────────────
  const agregarAlPedido = (producto: Producto) => {
    if (producto.requiere_presas) {
      // Abrir modal de selección de presas
      setPresasModalProducto(producto);
      return;
    }
    agregarItemConNotas(producto, undefined);
  };

  const agregarItemConNotas = (producto: Producto, notas: string | undefined) => {
    const itemKey = `${producto.id}::${notas || ''}`;
    const precioUnitario = getPrecioUnitario(producto);

    setPedido((prev) => {
      const index = prev.findIndex((i) => i.itemKey === itemKey);
      if (index >= 0) {
        const nuevos = [...prev];
        nuevos[index].cantidad += 1;
        nuevos[index].subtotal = nuevos[index].cantidad * precioUnitario;
        return nuevos;
      }
      return [...prev, { producto, cantidad: 1, subtotal: precioUnitario, notas, itemKey }];
    });

    // En móvil: feedback
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      if ('vibrate' in navigator) navigator.vibrate(30);
    }
  };

  const handlePresasConfirmar = (seleccion: SeleccionPremiun) => {
    if (!presasModalProducto) return;
    const notas = formatearNotas(seleccion) || undefined;
    agregarItemConNotas(presasModalProducto, notas);
    setPresasModalProducto(null);
  };

  // ── Actualizar cantidad ───────────────────────────────────────────────────
  const actualizarCantidad = (itemKey: string, delta: number) => {
    setPedido((prev) => {
      return prev
        .map((item) => {
          if (item.itemKey === itemKey) {
            const nuevaCant = item.cantidad + delta;
            if (nuevaCant <= 0) return item;
            const precioUnitario = getPrecioUnitario(item.producto);
            return { ...item, cantidad: nuevaCant, subtotal: nuevaCant * precioUnitario };
          }
          return item;
        })
        .filter((item) => item.cantidad > 0);
    });
  };

  const eliminarDelPedido = (itemKey: string) => {
    setPedido((prev) => prev.filter((i) => i.itemKey !== itemKey));
  };

  // ── Cancelar pedido ───────────────────────────────────────────────────────
  const handleCancelarPedido = () => {
    setPedido([]);
    setIsCancelModalOpen(false);
    toast('Pedido cancelado', { icon: '🗑️' });
  };

  // ── Reimprimir desde pestaña Pedidos ─────────────────────────────────────
  const handleReimprimir = (ticket: TicketData) => {
    setTicketData(ticket);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // ── Confirmar venta ───────────────────────────────────────────────────────
  const handleConfirmarVenta = async (payload: ConfirmarVentaPayload) => {
    setIsProcessing(true);

    try {
      // 1. Crear la Venta
      const ventaData: any = {
        turno_id: turnoId,
        cajero_id: cajeroId,
        sucursal_id: sucursalId,
        subtotal: totalPedido,
        descuento: 0,
        total: totalPedido,
        metodo_pago: payload.metodo,
        monto_recibido: payload.montoRecibido,
        vuelto: payload.metodo === 'efectivo' ? (payload.montoRecibido - totalPedido) : 0,
        tipo_pedido: payload.tipoVenta,
        nombre_cliente: payload.nombreCliente || null,
        estado: "completada",
      };

      // Pago mixto
      if (payload.esMixto && payload.metodo2 && payload.monto2 !== undefined) {
        ventaData.metodo_pago_2 = payload.metodo2;
        ventaData.monto_pago_2 = payload.monto2;
      }

      const { data: venta, error: ventaError } = await supabase
        .from("ventas")
        .insert(ventaData)
        .select("id, numero_ticket")
        .single();

      if (ventaError) throw ventaError;

      // 2. Crear los Detalles de Venta
      const detalles = pedido.map((item) => ({
        venta_id: venta.id,
        producto_id: item.producto.id,
        nombre_producto: item.producto.nombre,
        precio_unitario: getPrecioUnitario(item.producto),
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        notas_item: item.notas || null,
      }));

      const { error: detalleError } = await supabase
        .from("detalle_ventas")
        .insert(detalles);

      if (detalleError) throw detalleError;

      // 3. Preparar Ticket para Imprimir
      const metodoPagoLabel = payload.metodo;
      const ticket: TicketData = {
        sucursalNombre,
        cajeroNombre,
        numeroTicket: String(venta.numero_ticket).padStart(4, "0"),
        tipoPedido: payload.tipoVenta,
        metodoPago: metodoPagoLabel,
        metodoPago2: payload.esMixto ? payload.metodo2 : undefined,
        montoPago2: payload.esMixto ? payload.monto2 : undefined,
        total: totalPedido,
        recibido: payload.montoRecibido,
        vuelto: payload.metodo === 'efectivo' ? (payload.montoRecibido - totalPedido) : 0,
        nombreCliente: payload.nombreCliente,
        items: pedido.map((i) => ({
          nombre: i.producto.nombre,
          cantidad: i.cantidad,
          precio: getPrecioUnitario(i.producto),
          subtotal: i.subtotal,
          notas: i.notas,
        })),
        fecha: new Date().toLocaleString("es-BO"),
      };
      setTicketData(ticket);

      toast.success("¡Venta completada! Generando ticket...");

      // Esperar renderizado y lanzar print
      setTimeout(() => {
        window.print();
        setPedido([]);
        setIsModalOpen(false);
        setTabActivo('catalogo');
      }, 500);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al registrar la venta: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const totalItems = pedido.reduce((s, i) => s + i.cantidad, 0);

  return (
    <>
      <div className="pos-client animate-fade-in no-print">
        {/* TAB BAR */}
        <div className="pos-tab-bar">
          <button
            className={`pos-tab-btn ${tabActivo === 'catalogo' ? 'active' : ''}`}
            onClick={() => setTabActivo('catalogo')}
          >
            <span className="pos-tab-icon">🍽️</span>
            Catálogo
          </button>
          <button
            className={`pos-tab-btn ${tabActivo === 'carrito' ? 'active' : ''}`}
            onClick={() => setTabActivo('carrito')}
          >
            <span className="pos-tab-icon">🛒</span>
            Carrito
            {pedido.length > 0 && (
              <span className="pos-tab-badge">{totalItems}</span>
            )}
            {pedido.length > 0 && (
              <span className="pos-tab-total">Bs. {fmt(totalPedido)}</span>
            )}
          </button>
          <button
            className={`pos-tab-btn ${tabActivo === 'pedidos' ? 'active' : ''}`}
            onClick={() => setTabActivo('pedidos')}
          >
            <span className="pos-tab-icon">📋</span>
            Pedidos
          </button>
        </div>

        {/* LADO IZQUIERDO: MENÚ */}
        <div className={`pos-menu ${tabActivo !== 'catalogo' ? 'pos-hidden-mobile' : ''}`}>
          {/* Barra de Búsqueda */}
          <div className="pos-search-bar">
            <div className="input-icon-wrap w-full">
              <Search size={18} className="icon" />
              <input
                type="text"
                placeholder="Buscar plato, bebida, combo..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input-field has-icon pos-search-input"
              />
            </div>
          </div>

          {/* Categorías */}
          {!busqueda && (
            <div className="pos-categorias-wrapper">
              {canScrollLeft && (
                <button className="pos-cat-arrow left" onClick={() => scrollCats('left')}>
                  <ChevronLeft size={20} />
                </button>
              )}
              <div
                className="pos-categorias"
                ref={catBarRef}
                onWheel={handleCatWheel}
              >
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoriaActiva(cat.id)}
                    className={`pos-cat-btn ${categoriaActiva === cat.id ? "active" : ""}`}
                  >
                    <span className="cat-icon">{cat.icono || "🍽️"}</span>
                    <span className="cat-nombre">{cat.nombre}</span>
                  </button>
                ))}
              </div>
              {canScrollRight && (
                <button className="pos-cat-arrow right" onClick={() => scrollCats('right')}>
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}

          {/* Grid de Productos */}
          <div className="pos-productos-grid">
            {productosFiltrados.length > 0 ? (
              productosFiltrados.map((prod) => {
                const precioMostrar = getPrecioUnitario(prod);
                return (
                  <div
                    key={prod.id}
                    className="pos-product-card card-hover"
                    onClick={() => agregarAlPedido(prod)}
                  >
                    <div className="pos-product-img-wrap">
                      {prod.imagen_url ? (
                        <Image
                          src={prod.imagen_url}
                          alt={prod.nombre}
                          fill
                          className="pos-product-img"
                        />
                      ) : (
                        <div className="pos-product-noimg">🍗</div>
                      )}
                      {prod.en_oferta && (
                        <div className="pos-product-badge badge-yellow">
                          ¡OFERTA!
                        </div>
                      )}
                      {prod.requiere_presas && (
                        <div className="pos-product-badge-presas" title="Selección de presas">
                          🍗
                        </div>
                      )}
                    </div>
                    <div className="pos-product-info">
                      <h3 className="pos-product-name">{prod.nombre}</h3>
                      <div className="pos-product-price-row">
                        <span className="pos-product-price">
                          Bs. {fmt(precioMostrar)}
                        </span>
                        {prod.en_oferta && prod.precio_oferta && (
                          <span className="pos-product-price-old">
                            Bs. {fmt(prod.precio)}
                          </span>
                        )}
                      </div>
                    </div>
                    <button className="pos-product-add">
                      <Plus size={18} />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="pos-empty-state">
                <ShoppingCart
                  size={40}
                  style={{ opacity: 0.2, marginBottom: "10px" }}
                />
                <p>No se encontraron productos.</p>
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO: TICKET o PEDIDOS */}
        <div className={`pos-ticket ${tabActivo === 'catalogo' ? 'pos-hidden-mobile' : ''}`}>

          {/* Encabezado con Tabs para la columna derecha (muy útil en desktop) */}
          <div className="ticket-column-tabs no-print">
            <button 
              className={`ticket-col-tab ${tabActivo !== 'pedidos' ? 'active' : ''}`}
              onClick={() => setTabActivo('carrito')}
            >
              🛒 Pedido Actual
              {pedido.length > 0 && <span className="tab-badge">{pedido.length}</span>}
            </button>
            <button 
              className={`ticket-col-tab ${tabActivo === 'pedidos' ? 'active' : ''}`}
              onClick={() => setTabActivo('pedidos')}
            >
              📋 Historial del Turno
            </button>
          </div>

          {/* Vista Carrito */}
          {tabActivo !== 'pedidos' && (
            <>
              <div className="ticket-header">
                <div className="ticket-header-actions w-full flex justify-end">
                  {pedido.length > 0 && (
                    <button
                      className="ticket-cancel-btn"
                      onClick={() => setIsCancelModalOpen(true)}
                      title="Vaciar carrito"
                    >
                      <XCircle size={18} />
                      <span>Vaciar Carrito</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="ticket-body">
                {pedido.length === 0 ? (
                  <div className="ticket-empty">
                    <div className="ticket-empty-icon">🍽️</div>
                    <p>
                      Agrega productos al
                      <br />
                      pedido para comenzar
                    </p>
                  </div>
                ) : (
                  <div className="ticket-items">
                    {pedido.map((item) => (
                      <div key={item.itemKey} className="ticket-item">
                        <div className="ticket-item-main">
                          <div className="ticket-item-name">
                            {item.producto.nombre}
                          </div>
                          {item.notas && (
                            <div className="ticket-item-notas">{item.notas}</div>
                          )}
                          <div className="ticket-item-sub">
                            Bs.{" "}
                            {fmt(getPrecioUnitario(item.producto))}{" "}
                            x {item.cantidad}
                          </div>
                        </div>

                        <div className="ticket-item-controls">
                          <button
                            className="ticket-btn-qty disable-dbl-tap-zoom"
                            onClick={() => actualizarCantidad(item.itemKey, -1)}
                          >
                            <Minus size={14} />
                          </button>
                          <span className="ticket-qty-value">{item.cantidad}</span>
                          <button
                            className="ticket-btn-qty add disable-dbl-tap-zoom"
                            onClick={() => actualizarCantidad(item.itemKey, 1)}
                          >
                            <Plus size={14} />
                          </button>
                        </div>

                        <div className="ticket-item-price">
                          Bs. {fmt(item.subtotal)}
                        </div>

                        <button
                          className="ticket-btn-delete"
                          onClick={() => eliminarDelPedido(item.itemKey)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ticket-footer">
                <div className="ticket-totals">
                  <div className="ticket-total-row">
                    <span className="ticket-total-label">Subtotal</span>
                    <span className="ticket-total-val">Bs. {fmt(totalPedido)}</span>
                  </div>
                  <div className="ticket-divider" />
                  <div className="ticket-total-row big">
                    <span className="ticket-total-label">TOTAL</span>
                    <span className="ticket-total-val text-red">
                      Bs. {fmt(totalPedido)}
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-lg w-full ticket-cobrar-btn"
                  disabled={pedido.length === 0}
                  onClick={() => setIsModalOpen(true)}
                >
                  <span>Cobrar Pedido</span>
                  <ArrowRight size={20} />
                </button>
              </div>
            </>
          )}

          {/* Vista Pedidos */}
          {tabActivo === 'pedidos' && (
            <PedidosTab
              turnoId={turnoId}
              cajeroNombre={cajeroNombre}
              sucursalNombre={sucursalNombre}
              onReimprimir={handleReimprimir}
            />
          )}
        </div>

        {/* Tab de Pedidos en desktop (columna extra o panel) */}
        {tabActivo === 'pedidos' && (
          <div className="pos-pedidos-desktop-panel">
            <PedidosTab
              turnoId={turnoId}
              cajeroNombre={cajeroNombre}
              sucursalNombre={sucursalNombre}
              onReimprimir={handleReimprimir}
            />
          </div>
        )}

        {/* Modal Cobro */}
        <CobroModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          total={totalPedido}
          onConfirmar={handleConfirmarVenta}
          cargando={isProcessing}
        />

        {/* Modal Vaciar Carrito */}
        {isCancelModalOpen && (
          <div className="cancel-overlay">
            <div className="cancel-modal animate-fade-in-scale">
              <div className="cancel-icon">🗑️</div>
              <h3 className="cancel-title">¿Vaciar el carrito?</h3>
              <p className="cancel-text">
                Se eliminarán los {totalItems} items del carrito actual.
                Esta acción no se puede deshacer.
              </p>
              <div className="cancel-actions">
                <button
                  className="btn btn-ghost"
                  onClick={() => setIsCancelModalOpen(false)}
                >
                  No, volver
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleCancelarPedido}
                >
                  <XCircle size={16} />
                  Sí, vaciar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Presas */}
        {presasModalProducto && (
          <PresasModal
            nombreProducto={presasModalProducto.nombre}
            onConfirmar={handlePresasConfirmar}
            onCancelar={() => setPresasModalProducto(null)}
          />
        )}

        <style>{`
        /* ── TAB BAR ─────────────────────────── */
        .pos-tab-bar {
          display: none;
        }
        @media (max-width: 768px) {
          .pos-tab-bar {
            display: flex;
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--bg-800);
            border-bottom: 2px solid var(--border);
            flex-shrink: 0;
          }
          .pos-tab-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 12px 8px;
            font-size: 0.9rem;
            font-weight: 600;
            color: var(--text-400);
            background: transparent;
            border: none;
            border-bottom: 3px solid transparent;
            transition: var(--transition);
            position: relative;
          }
          .pos-tab-btn.active {
            color: var(--red);
            border-bottom-color: var(--red);
          }
          .pos-tab-icon { font-size: 1.1rem; }
          .pos-tab-badge {
            background: var(--red);
            color: #fff;
            border-radius: 99px;
            font-size: 0.7rem;
            font-weight: 700;
            padding: 2px 7px;
            min-width: 20px;
            text-align: center;
          }
          .pos-tab-total {
            font-size: 0.75rem;
            font-weight: 700;
            color: var(--yellow);
            margin-left: 2px;
          }
          .pos-hidden-mobile {
            display: none !important;
          }
        }

        /* ── LAYOUT PRINCIPAL ────────────────── */
        .pos-client {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          gap: 0;
          background: var(--bg-900);
        }
        @media (min-width: 769px) {
          .pos-client {
            flex-direction: row;
          }
        }

        /* ── MENÚ (IZQUIERDA) ────────────────── */
        .pos-menu {
          flex: 0 0 65%;
          display: flex;
          flex-direction: column;
          padding: 24px;
          gap: 20px;
          border-right: 1px solid var(--border);
          overflow: hidden;
        }
        @media (max-width: 1024px) {
          .pos-menu {
            flex: 0 0 60%;
            padding: 16px;
            gap: 14px;
          }
        }
        @media (max-width: 768px) {
          .pos-menu {
            flex: 1;
            padding: 12px;
            border-right: none;
            overflow: auto;
            min-height: 0;
          }
        }

        .pos-search-input {
          background: var(--bg-800);
          border: 1px solid var(--border);
          padding: 14px 16px 14px 44px;
          font-size: 1.05rem;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .pos-search-input:focus {
          border-color: var(--red);
          background: var(--bg-700);
        }

        .pos-categorias-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          gap: 0;
        }
        .pos-cat-arrow {
          flex-shrink: 0;
          width: 36px; height: 36px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-700); border: 1px solid var(--border);
          border-radius: 50%; color: var(--text-300); cursor: pointer;
          transition: var(--transition); z-index: 2;
        }
        .pos-cat-arrow:hover { background: var(--red); color: #fff; border-color: var(--red); }
        .pos-cat-arrow.left { margin-right: 8px; }
        .pos-cat-arrow.right { margin-left: 8px; }

        .pos-categorias {
          display: flex; flex: 1; gap: 10px;
          overflow-x: auto; padding-bottom: 4px;
          scroll-behavior: smooth;
          -ms-overflow-style: none; scrollbar-width: none;
        }
        .pos-categorias::-webkit-scrollbar { display: none; }

        .pos-cat-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; background: var(--bg-800);
          border: 1px solid var(--border); border-radius: var(--radius-full);
          color: var(--text-300); font-weight: 600; font-size: 0.95rem;
          white-space: nowrap; transition: var(--transition);
        }
        .pos-cat-btn:hover { background: var(--bg-700); color: var(--text-200); }
        .pos-cat-btn.active {
          background: var(--red); color: white;
          border-color: var(--red-light); box-shadow: var(--shadow-red);
        }
        .cat-icon { font-size: 1.2rem; }

        .pos-productos-grid {
          flex: 1;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          overflow-y: auto;
          padding-right: 4px;
          padding-bottom: 24px;
        }
        @media (max-width: 768px) {
          .pos-productos-grid {
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 10px;
          }
        }

        .pos-product-card {
          background: var(--bg-700); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 12px;
          display: flex; flex-direction: column; gap: 12px;
          cursor: pointer; position: relative; transition: var(--transition);
        }
        .pos-product-card:hover { border-color: var(--border-hover); transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.3); }
        .pos-product-card:active { transform: scale(0.97); }
        @media (max-width: 768px) {
          .pos-product-card { padding: 8px; gap: 8px; }
        }

        .pos-product-img-wrap {
          width: 100%; aspect-ratio: 1;
          border-radius: var(--radius-md); background: var(--bg-800);
          position: relative; overflow: hidden;
        }
        .pos-product-img { object-fit: cover; }
        .pos-product-noimg {
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; opacity: 0.1;
        }
        .pos-product-badge {
          position: absolute; top: 8px; left: 8px;
          z-index: 10; box-shadow: var(--shadow-sm);
        }
        .pos-product-badge-presas {
          position: absolute; top: 8px; right: 8px;
          z-index: 10; font-size: 1rem;
          background: rgba(253,216,53,0.9); border-radius: 50%;
          width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center;
        }

        .pos-product-info { flex: 1; display: flex; flex-direction: column; gap: 4px; }
        .pos-product-name {
          font-size: 0.95rem; font-weight: 700; color: var(--text-100);
          line-height: 1.2;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        @media (max-width: 768px) {
          .pos-product-name { font-size: 0.85rem; }
        }
        .pos-product-price-row { display: flex; align-items: baseline; gap: 8px; margin-top: auto; }
        .pos-product-price { font-size: 1.15rem; font-weight: 800; color: var(--yellow); }
        .pos-product-price-old { font-size: 0.8rem; color: var(--text-500); text-decoration: line-through; }
        @media (max-width: 768px) {
          .pos-product-price { font-size: 1rem; }
        }

        .pos-product-add {
          position: absolute; bottom: 12px; right: 12px;
          width: 32px; height: 32px; border-radius: 50%;
          background: var(--red); color: white;
          display: flex; align-items: center; justify-content: center;
          box-shadow: var(--shadow-sm); transition: var(--transition);
        }
        .pos-product-card:hover .pos-product-add { transform: scale(1.1); }
        @media (max-width: 768px) {
          .pos-product-add { bottom: 8px; right: 8px; width: 28px; height: 28px; }
        }

        .pos-empty-state {
          grid-column: 1 / -1;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          color: var(--text-500); margin-top: 40px;
        }

        /* ── TICKET (DERECHA) ────────────────── */
        .pos-ticket {
          flex: 0 0 35%;
          background: var(--bg-800);
          display: flex; flex-direction: column;
          position: relative;
          min-height: 0;
        }
        @media (max-width: 1024px) { .pos-ticket { flex: 0 0 40%; } }
        @media (max-width: 768px) { .pos-ticket { flex: 1; min-height: 0; } }

        /* Desktop: ocultar el panel de pedidos del ticket cuando tab=pedidos */
        @media (min-width: 769px) {
          .pos-pedidos-desktop-panel {
            display: none; /* Se integra dentro de pos-ticket */
          }
        }

        .ticket-column-tabs {
          display: flex;
          background: var(--bg-900);
          border-bottom: 1px solid var(--border);
          flex-shrink: 0;
        }
        .ticket-col-tab {
          flex: 1; padding: 14px 8px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          background: transparent; border: none;
          color: var(--text-400); font-weight: 700; font-size: 0.95rem;
          border-bottom: 3px solid transparent;
          transition: var(--transition);
        }
        .ticket-col-tab:hover { background: var(--bg-800); color: var(--text-200); }
        .ticket-col-tab.active {
          color: var(--red);
          border-bottom-color: var(--red);
          background: var(--bg-800);
        }
        .tab-badge {
          background: var(--red); color: white; border-radius: 99px;
          font-size: 0.7rem; font-weight: 800; padding: 2px 8px;
        }

        .ticket-header {
          padding: 16px 24px; display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        @media (max-width: 768px) { .ticket-header { padding: 14px 16px; } }
        .ticket-title { font-size: 1.2rem; font-weight: 800; color: var(--text-100); }

        .ticket-header-actions {
          display: flex; align-items: center; gap: 10px;
        }
        .ticket-cancel-btn {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 10px; border-radius: var(--radius-md);
          background: rgba(211,47,47,0.08);
          border: 1px solid rgba(211,47,47,0.2);
          color: var(--red); font-size: 0.8rem; font-weight: 600;
          transition: var(--transition);
        }
        .ticket-cancel-btn:hover { background: rgba(211,47,47,0.2); }

        .ticket-body { flex: 1; overflow-y: auto; position: relative; min-height: 0; }

        .ticket-empty {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: var(--text-500); text-align: center; gap: 16px;
        }
        .ticket-empty-icon {
          font-size: 3rem; background: var(--bg-700);
          width: 80px; height: 80px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        .ticket-items { display: flex; flex-direction: column; }
        .ticket-item {
          display: grid;
          grid-template-columns: 1fr auto auto auto;
          gap: 12px; align-items: center;
          padding: 16px 24px;
          border-bottom: 1px dashed rgba(0,0,0,0.08);
          animation: slideInLeft 0.2s ease forwards;
        }
        @media (max-width: 768px) { .ticket-item { padding: 12px 16px; gap: 8px; } }
        .ticket-item:hover { background: rgba(0,0,0,0.02); }

        .ticket-item-main { min-width: 0; }
        .ticket-item-name { font-size: 0.95rem; font-weight: 600; color: var(--text-100); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ticket-item-notas { font-size: 0.75rem; color: var(--yellow); font-style: italic; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ticket-item-sub { font-size: 0.8rem; color: var(--text-500); margin-top: 2px; }

        .ticket-item-controls {
          display: flex; align-items: center; gap: 8px;
          background: var(--bg-600); border-radius: var(--radius-full); padding: 4px;
        }
        .ticket-btn-qty {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--bg-500); color: var(--text-300);
          display: flex; align-items: center; justify-content: center; transition: var(--transition);
        }
        .ticket-btn-qty:hover { background: var(--bg-400); color: var(--text-100); }
        .ticket-btn-qty.add { background: rgba(253,216,53,0.15); color: var(--yellow); }
        .ticket-btn-qty.add:hover { background: var(--yellow); color: #000; }
        .ticket-qty-value { width: 16px; text-align: center; font-weight: 700; font-size: 0.9rem; }

        .ticket-item-price { font-weight: 800; font-size: 1.05rem; min-width: 80px; text-align: right; }

        .ticket-btn-delete { color: var(--text-600); padding: 6px; border-radius: var(--radius-sm); }
        .ticket-btn-delete:hover { color: var(--red); background: rgba(211,47,47,0.1); }

        .ticket-footer {
          background: var(--bg-800); padding: 24px;
          border-top: 1px solid var(--border);
          box-shadow: 0 -10px 30px rgba(0,0,0,0.08);
          z-index: 10; flex-shrink: 0;
        }
        @media (max-width: 768px) { .ticket-footer { padding: 14px 16px; } }

        .ticket-totals { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
        .ticket-total-row { display: flex; justify-content: space-between; align-items: center; }
        .ticket-total-label { color: var(--text-400); font-size: 0.95rem; }
        .ticket-total-val { color: var(--text-200); font-weight: 600; font-size: 1rem; }
        .ticket-total-row.big .ticket-total-label { font-size: 1.2rem; font-weight: 800; color: var(--text-100); }
        .ticket-total-row.big .ticket-total-val { font-size: 1.8rem; font-weight: 900; }
        .text-red { color: var(--red) !important; }
        .ticket-divider { height: 1px; background: var(--border); }

        .ticket-cobrar-btn {
          height: 60px; font-size: 1.2rem; border-radius: var(--radius-xl);
          justify-content: space-between; padding: 0 30px;
          background: linear-gradient(135deg, var(--red-dark), var(--red));
          flex-shrink: 0;
        }
        .ticket-cobrar-btn:disabled { opacity: 0.5; filter: grayscale(1); cursor: not-allowed; }
        @media (max-width: 768px) {
          .ticket-cobrar-btn { height: 52px; font-size: 1.05rem; }
        }

        .disable-dbl-tap-zoom { touch-action: manipulation; }

        /* ── MODAL CANCELAR ─────────────────── */
        .cancel-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          z-index: 10001; padding: 20px;
        }
        .cancel-modal {
          background: var(--bg-800); border: 1px solid var(--border);
          border-radius: var(--radius-xl); padding: 32px;
          max-width: 380px; width: 100%;
          text-align: center;
          box-shadow: 0 24px 60px rgba(0,0,0,0.6);
        }
        .cancel-icon { font-size: 3rem; margin-bottom: 12px; }
        .cancel-title { font-size: 1.2rem; font-weight: 800; color: var(--text-100); margin-bottom: 8px; }
        .cancel-text { font-size: 0.9rem; color: var(--text-400); line-height: 1.5; margin-bottom: 24px; }
        .cancel-actions { display: flex; gap: 12px; justify-content: center; }

        /* ── DARK MODE (fondo más oscuro aún) ── */
        :global(.pos-dark) {
          --bg-900: #050508;
          --bg-800: #0c0c12;
          --bg-700: #111118;
          --bg-600: #161622;
          --bg-500: #1a1a26;
          --bg-400: #1f1f2e;
          --text-100: #f0f0ff;
          --text-200: #d0d0e8;
          --text-300: #b0b0cc;
          --text-400: #8080a0;
          --text-500: #606080;
          --text-600: #404060;
          --border: rgba(255,255,255,0.06);
          --border-hover: rgba(255,255,255,0.12);
          --yellow: #e5c200;
          --red: #c0392b;
        }
        :global(.pos-dark) .ticket-item { border-bottom-color: rgba(255,255,255,0.04); }
        :global(.pos-dark) .pos-product-card { box-shadow: none; }

        `}</style>
      </div>

      {/* Área de impresión */}
      <div className="print-area">
        <TicketVenta data={ticketData} />
      </div>

      <style>{`
        @media screen {
          .print-area { display: none; }
        }
        @media print {
          @page {
            size: 72mm 297mm;
            margin: 0;
          }
          body, html { margin: 0; padding: 0; background: #fff; }
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area {
            position: absolute;
            left: 0; top: 0;
            width: 72mm;
            background: #fff;
            margin: 0; padding: 0;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </>
  );
}
