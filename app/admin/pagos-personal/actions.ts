'use server'

import { createClient } from '@/lib/supabase/server'
import type { PeriodoPago } from '@/lib/types/database'

interface NuevoPago {
  sucursal_id: string
  empleado_id: string | null
  personal_operativo_id: string | null
  nombre_empleado: string
  concepto: string
  periodo: PeriodoPago
  estado: 'pagado' | 'pendiente'
  monto: number
  fecha_pago: string
  observaciones: string | null
}

async function contexto() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw new Error('No se pudo verificar la sesión. Revisa la conexión y vuelve a intentarlo.')
  if (!user) throw new Error('Tu sesión terminó. Vuelve a iniciar sesión antes de registrar pagos.')
  const { data: perfil, error: perfilError } = await supabase.from('perfiles')
    .select('rol, sucursal_id, activo').eq('id', user.id).single()
  if (perfilError || !perfil?.activo || !['admin', 'supervisor'].includes(perfil.rol)) {
    throw new Error('No tienes permisos para gestionar pagos al personal.')
  }
  return { supabase, user, perfil }
}

function mensaje(error: unknown) {
  if (error instanceof Error && !/fetch|network|ENOTFOUND|ECONN/i.test(error.message)) return error.message
  return 'No se pudo confirmar la operación. Conserva los datos y revisa el listado antes de reintentar para evitar duplicados.'
}

export async function registrarPagoPersonal(pago: NuevoPago) {
  try {
    if (!pago || !pago.nombre_empleado?.trim() || !pago.concepto?.trim()
      || !Number.isFinite(pago.monto) || pago.monto <= 0
      || !['diario', 'semanal', 'mensual'].includes(pago.periodo)
      || !['pagado', 'pendiente'].includes(pago.estado)
      || !/^\d{4}-\d{2}-\d{2}$/.test(pago.fecha_pago)
      || !pago.sucursal_id || (pago.empleado_id && pago.personal_operativo_id)) {
      return { error: 'Revisa el empleado, concepto, monto, fecha y sucursal del pago.' }
    }
    const { supabase, user, perfil } = await contexto()
    if (perfil.rol === 'supervisor' && pago.sucursal_id !== perfil.sucursal_id) {
      return { error: 'Solo puedes registrar pagos en tu sucursal.' }
    }
    // El autor se obtiene de la sesión del servidor, nunca del formulario.
    const { data, error } = await supabase.from('pagos_personal').insert({
      sucursal_id: pago.sucursal_id,
      empleado_id: pago.empleado_id || null,
      personal_operativo_id: pago.personal_operativo_id || null,
      registrado_por: user.id,
      nombre_empleado: pago.nombre_empleado.trim(),
      concepto: pago.concepto.trim(),
      periodo: pago.periodo,
      estado: pago.estado,
      fecha_pagado: pago.estado === 'pagado' ? new Date().toISOString() : null,
      monto: pago.monto,
      fecha_pago: pago.fecha_pago,
      observaciones: pago.observaciones?.trim() || null,
    }).select('*, sucursales(nombre)').single()
    if (error) {
      console.error('Error al registrar pago personal:', error)
      return { error: error.code === '42501'
        ? 'La base de datos rechazó el pago por permisos. Revisa el acceso de esta cuenta a la sucursal.'
        : 'No se pudo confirmar el registro. Revisa el listado antes de reintentar para evitar duplicados.' }
    }
    return { data }
  } catch (error) {
    return { error: mensaje(error) }
  }
}

export async function liquidarPagosPersonal(ids: string[]) {
  try {
    if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string')) {
      return { error: 'Selecciona los pagos pendientes.' }
    }
    const { supabase, perfil } = await contexto()
    const fecha = new Date().toISOString()
    let query = supabase.from('pagos_personal')
      .update({ estado: 'pagado', fecha_pagado: fecha }).in('id', [...new Set(ids)])
      .eq('estado', 'pendiente')
    if (perfil.rol === 'supervisor') query = query.eq('sucursal_id', perfil.sucursal_id)
    const { data, error } = await query.select('id, estado, fecha_pagado')
    if (error) {
      console.error('Error al liquidar pagos:', error)
      return { error: 'No se pudo confirmar la liquidación. Revisa los permisos y el listado antes de reintentar.' }
    }
    if (!data?.length) return { error: 'No se actualizó ningún pago. Puede que ya estén pagados o que tu cuenta no tenga permiso para liquidarlos.' }
    return { data }
  } catch (error) {
    return { error: mensaje(error) }
  }
}
