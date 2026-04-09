import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// GET — público (ruteo lo usa para mostrar contactos)
export async function GET(req: NextRequest) {
  const sucursal = req.nextUrl.searchParams.get('sucursal')
  let q = supabase.from('soporte_contactos').select('*').eq('activo', true).order('sucursal').order('nombre')
  if (sucursal) q = q.eq('sucursal', sucursal) as any
  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contactos: data ?? [] })
}

// POST — crear
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { nombre, telefono, sucursal } = body
  if (!nombre || !telefono || !sucursal)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  const telefono_limpio = telefono.replace(/\D/g, '')
  const { data, error } = await supabase.from('soporte_contactos')
    .insert({ nombre, telefono: telefono_limpio, sucursal, activo: true })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacto: data })
}

// PATCH — editar / toggle activo
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...rest } = body
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  if (rest.telefono) rest.telefono = rest.telefono.replace(/\D/g, '')
  const { data, error } = await supabase.from('soporte_contactos').update(rest).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacto: data })
}

// DELETE
export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const { error } = await supabase.from('soporte_contactos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
