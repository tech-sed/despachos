import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET /api/requerimientos?estado=&sucursal_origen=&sucursal_destino=&fecha_desde=&fecha_hasta=&tab=pendientes|transito|historial
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') ?? 'pendientes'
  const sucursal_origen = searchParams.get('sucursal_origen') ?? ''
  const sucursal_destino = searchParams.get('sucursal_destino') ?? ''
  const fecha_desde = searchParams.get('fecha_desde') ?? ''
  const fecha_hasta = searchParams.get('fecha_hasta') ?? ''

  let query = admin
    .from('requerimientos')
    .select('*, requerimiento_items(*)')
    .order('created_at', { ascending: false })

  if (tab === 'pendientes') {
    query = query.in('estado', ['pendiente', 'conf_stock', 'preparacion'])
  } else if (tab === 'transito') {
    query = query.eq('estado', 'en_transito')
  } else {
    // historial
    query = query.in('estado', ['entregado', 'rechazado'])
  }

  if (sucursal_origen) query = query.eq('sucursal_origen', sucursal_origen)
  if (sucursal_destino) query = query.eq('sucursal_destino', sucursal_destino)
  if (fecha_desde) query = query.gte('fecha_solicitada', fecha_desde)
  if (fecha_hasta) query = query.lte('fecha_solicitada', fecha_hasta)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/requerimientos — crear nuevo requerimiento con sus items
export async function POST(req: NextRequest) {
  const admin = getAdmin()
  const body = await req.json()
  const { items, ...reqData } = body

  const { data: req_, error: reqErr } = await admin
    .from('requerimientos')
    .insert(reqData)
    .select()
    .single()

  if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 })

  if (items?.length > 0) {
    const { error: itemsErr } = await admin
      .from('requerimiento_items')
      .insert(items.map((it: any) => ({ ...it, requerimiento_id: req_.id })))
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id: req_.id })
}

// PATCH /api/requerimientos — actualizar estado u otros campos
export async function PATCH(req: NextRequest) {
  const admin = getAdmin()
  const body = await req.json()
  const { id, items_update, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { error } = await admin.from('requerimientos').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Actualizar cantidades aprobadas de items si se enviaron
  if (items_update?.length > 0) {
    for (const item of items_update) {
      const { id: itemId, cantidad_aprobada, notas } = item
      await admin.from('requerimiento_items')
        .update({ cantidad_aprobada, notas })
        .eq('id', itemId)
    }
  }

  return NextResponse.json({ success: true })
}
