'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Printer, Bluetooth, Download, Share2, X } from 'lucide-react'
import TicketVenta, { type TicketData } from './TicketVenta'
import { useConfigImpresora } from '@/lib/impresion/use-config-impresora'
import { compatibilidadImpresora, conectarBLE, conectarSerie, desconectarImpresora, enviarTicket, modoConectado, nombreImpresora, observarImpresora } from '@/lib/impresion/conexion'
import { crearImagenTicket, archivoTicket } from '@/lib/impresion/ticket-imagen'
import { codificarRaster } from '@/lib/impresion/raster'
import { abrirImpresionSistema } from '@/lib/impresion/sistema'

export default function PanelImpresora({ data, onClose }: { data?: TicketData; onClose: () => void }) {
  const { config, guardar } = useConfigImpresora()
  const nombre = useSyncExternalStore(observarImpresora, nombreImpresora, () => '')
  const [compatible, setCompatible] = useState({ ble: false, serial: false })
  const [ocupado, setOcupado] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const bloqueo = useRef(false)
  const ticket = useMemo<TicketData>(() => data || ({
    numeroTicket: 'PRUEBA', cajeroNombre: 'Prueba de impresora', sucursalNombre: "Pollos Q' Delicia",
    fecha: new Date().toLocaleString('es-BO'), tipoPedido: 'mesa', metodoPago: 'efectivo', total: 1, recibido: 1, vuelto: 0,
    items: [{ nombre: 'PRUEBA SIN VENTA · Ñ á é í ó ú', cantidad: 1, precio: 1, subtotal: 1, notas: 'Texto largo de prueba para comprobar el ancho y la lectura del ticket.' }],
  }), [data])
  useEffect(() => { dialog.current?.showModal(); setCompatible(compatibilidadImpresora()) }, [])
  const esKP1025 = /\bKP[- ]?1025\b/i.test(nombre)
  useEffect(() => {
    // La KP-1025 solo admite rollo de 58 mm (48 mm imprimibles). Evita enviar
    // una imagen de 80 mm que el cabezal recortaría por el lado derecho.
    if (esKP1025 && config.papel !== 58) {
      guardar({ papel: 58 })
      setMensaje('Detectamos una KP-1025: ajustamos el ticket a 58 mm para que salga completo.')
    }
  }, [esKP1025, config.papel, guardar])
  useEffect(() => {
    let vigente = true
    setArchivo(null)
    try {
      const canvas = crearImagenTicket(ticket, config)
      archivoTicket(canvas, ticket.numeroTicket).then(f => { if (vigente) setArchivo(f) })
        .catch(() => { if (vigente) setError('No se pudo preparar la imagen. Puedes usar la impresión del sistema.') })
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo preparar el ticket.') }
    return () => { vigente = false }
  }, [ticket, config])

  async function ejecutar(fn: () => Promise<void>) {
    if (bloqueo.current) return
    bloqueo.current = true; setOcupado(true); setError(''); setMensaje(''); setProgreso(0)
    try { await fn() }
    catch (e) { setError(e instanceof DOMException && e.name === 'NotFoundError' ? 'No se seleccionó ninguna impresora.' : e instanceof Error ? e.message : 'No se pudo completar la impresión.') }
    finally { bloqueo.current = false; setOcupado(false) }
  }
  function imprimir() {
    if (config.modo === 'sistema') {
      try { if (preview.current) abrirImpresionSistema(preview.current, config) }
      catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir la impresión.') }
      return
    }
    void ejecutar(async () => {
      const copias = config.copias === 'ambos' ? ['cocina', 'cliente'] as const : [config.copias]
      for (let i = 0; i < copias.length; i++) {
        const copiaConfig = { ...config, copias: copias[i] }
        const copiaCanvas = crearImagenTicket(ticket, copiaConfig)
        const copiaPixels = copiaCanvas.getContext('2d')!.getImageData(0, 0, copiaCanvas.width, copiaCanvas.height)
        await enviarTicket(codificarRaster(copiaPixels.data, copiaCanvas.width, copiaCanvas.height, config.corteAutomatico), config.modo as 'ble' | 'serial', porcentaje => setProgreso(Math.round((i * 100 + porcentaje) / copias.length)))
      }
      setMensaje(config.copias === 'ambos' ? 'Tickets de cocina y cliente enviados por separado.' : 'Ticket enviado a la impresora.')
    })
  }
  function descargar() {
    if (!archivo) return
    const url = URL.createObjectURL(archivo)
    const a = document.createElement('a'); a.href = url; a.download = archivo.name
    document.body.append(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }
  function compartir() {
    if (!archivo) return
    if (!navigator.canShare?.({ files: [archivo] })) { setError('Este navegador no permite compartir archivos. Descarga el ticket y ábrelo con la aplicación de tu impresora.'); return }
    void navigator.share({ files: [archivo], title: `Ticket ${ticket.numeroTicket}` }).catch(e => {
      if (e?.name !== 'AbortError') setError('No se pudo compartir. Descarga la imagen y ábrela con la aplicación de tu impresora.')
    })
  }
  const conexionLista = config.modo === 'sistema' || (nombre && modoConectado() === config.modo)
  return <dialog ref={dialog} className="panel-impresora" aria-labelledby="impresora-titulo" onCancel={e => { if (bloqueo.current) e.preventDefault(); else onClose() }}>
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottom: '1px solid var(--border)' }}>
      <h2 id="impresora-titulo" style={{ fontWeight: 800, fontSize: '1.15rem' }}><Printer size={20} />{data ? ` Imprimir ticket #${ticket.numeroTicket}` : ' Configurar y probar impresora'}</h2>
      <button disabled={ocupado} onClick={onClose} className="btn btn-ghost" aria-label="Cerrar configuración de impresora"><X size={20} /></button>
    </header>
    <div style={{ padding: 20, overflowY: 'auto', maxHeight: '75vh' }}>
      <p style={{ marginBottom: 16 }}>{data ? 'La venta ya está guardada. Imprimir de nuevo no registra otra venta.' : 'La prueba no registra ventas. La configuración se guarda solo en este dispositivo.'}</p>
      <fieldset disabled={ocupado} style={{ border: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <label>Papel<select className="form-input" value={esKP1025 ? 58 : config.papel} onChange={e => guardar({ papel: Number(e.target.value) as 58 | 80 })}><option value={58}>58 mm</option>{!esKP1025 && <option value={80}>80 mm</option>}</select></label>
        <label>Tickets<select className="form-input" value={config.copias} onChange={e => guardar({ copias: e.target.value as typeof config.copias })}><option value="ambos">Cocina y cliente</option><option value="cocina">Solo cocina</option><option value="cliente">Solo cliente</option></select></label>
        <label>Conexión<select className="form-input" value={config.modo} onChange={e => { guardar({ modo: e.target.value as typeof config.modo }); setError(''); setMensaje('') }}>
          <option value="sistema">Impresora del sistema / PDF</option><option value="ble" disabled={!compatible.ble}>Bluetooth BLE · ESC/POS{!compatible.ble ? ' (no disponible)' : ''}</option><option value="serial" disabled={!compatible.serial}>USB por COM virtual / Bluetooth clásico{!compatible.serial ? ' (no disponible)' : ''}</option>
        </select></label>
        {config.modo === 'serial' && <label>Velocidad del puerto<select className="form-input" value={config.velocidad} onChange={e => guardar({ velocidad: Number(e.target.value) })}>{[9600, 19200, 38400, 57600, 115200].map(v => <option key={v} value={v}>{v}</option>)}</select></label>}
      </fieldset>
      <p style={{ marginTop: 14, color: 'var(--text-400)', fontSize: '0.9rem' }}>{config.modo === 'sistema'
        ? 'Windows: instala o empareja la impresora y selecciónala en el diálogo. Android: usa un servicio de impresión compatible o comparte la imagen con la aplicación del fabricante.'
        : config.modo === 'ble' ? 'Para impresoras térmicas ESC/POS con servicio BLE compatible, como algunas POS-5805, MPT-II y Xprinter. Si no aparece tu modelo, usa la impresión del sistema o la aplicación del fabricante.'
        : 'USB: instala el controlador Virtual COM del fabricante y selecciona el puerto COM. Bluetooth clásico: empareja la impresora y elige su puerto. Requiere Chrome/Edge y una impresora ESC/POS.'}</p>
      {config.modo !== 'sistema' && <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}><input type="checkbox" disabled={ocupado} checked={config.corteAutomatico} onChange={e => guardar({ corteAutomatico: e.target.checked })} />Cortar cada ticket al terminar (solo XP-80C u otra impresora con cuchilla)</label>}
      {nombre && <p role="status" style={{ marginTop: 12 }}>Conectada: {nombre}</p>}
      {esKP1025 && <p role="note" style={{ marginTop: 8, color: 'var(--yellow)' }}>La KP-1025 trabaja con rollo de 58 mm (48 mm de impresión). El ancho se ajustó automáticamente.</p>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, margin: '16px 0' }}>
        {config.modo !== 'sistema' && !nombre && <button className="btn btn-primary" disabled={ocupado} onClick={() => void ejecutar(async () => { if (config.modo === 'ble') await conectarBLE(); else await conectarSerie(config.velocidad); setMensaje('Conexión preparada. Haz una prueba antes de imprimir ventas.') })}><Bluetooth size={16} /> Conectar impresora</button>}
        {nombre && <button className="btn btn-ghost" disabled={ocupado} onClick={() => void ejecutar(desconectarImpresora)}>Desconectar</button>}
        <button className="btn btn-primary" disabled={ocupado || !conexionLista} onClick={imprimir}><Printer size={16} />{ocupado ? `Enviando ${progreso}%…` : config.modo === 'sistema' ? 'Abrir para imprimir' : data ? 'Imprimir ticket' : 'Imprimir prueba'}</button>
        <button className="btn btn-ghost" disabled={ocupado || !archivo} onClick={descargar}><Download size={16} /> Descargar imagen</button>
        <button className="btn btn-ghost" disabled={ocupado || !archivo} onClick={compartir}><Share2 size={16} /> Compartir imagen</button>
      </div>
      {error && <p role="alert" style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
      {mensaje && <p role="status" style={{ marginBottom: 12 }}>{mensaje}</p>}
      <details><summary style={{ cursor: 'pointer', margin: '12px 0' }}>Ver ticket preparado · {config.papel} mm</summary><div style={{ overflowX: 'auto', background: '#eee', padding: 12 }}><div ref={preview}><TicketVenta data={ticket} papel={config.papel} copias={config.copias} /></div></div></details>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-400)', marginTop: 16 }}>El soporte depende del modelo y navegador. No se reintentan envíos automáticamente: comprueba el papel antes de volver a imprimir.</p>
    </div>
    <style>{`.panel-impresora{margin:auto;width:min(800px,calc(100% - 24px));max-height:94vh;padding:0;border:1px solid var(--border);border-radius:18px;background:var(--bg-800);color:var(--text-100)}.panel-impresora::backdrop{background:rgba(0,0,0,.65)}.panel-impresora label{display:flex;flex-direction:column;gap:6px}`}</style>
  </dialog>
}

export function BotonImpresora() {
  const [abierto, setAbierto] = useState(false)
  return <><button className="btn-pos-dark" title="Configurar y probar impresora" aria-label="Configurar y probar impresora" onClick={() => setAbierto(true)}><Printer size={18} /></button>{abierto && <PanelImpresora onClose={() => setAbierto(false)} />}</>
}
