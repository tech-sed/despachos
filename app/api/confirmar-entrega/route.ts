import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pedidoId = formData.get('pedido_id') as string
    const nota = formData.get('nota') as string
    const foto = formData.get('foto') as File | null

    if (!pedidoId) {
      return NextResponse.json({ error: 'Falta pedido_id' }, { status: 400 })
    }

    let foto_url = null

    if (foto) {
      const fileName = `entregas/${pedidoId}_${Date.now()}.jpg`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('solicitudes-despacho')
        .upload(fileName, foto)

      if (!uploadError) {
        foto_url = uploadData?.path
      }
    }

    const { error } = await supabase
      .from('pedidos')
      .update({
        estado: 'entregado',
        notas: nota || null,
        // foto_url se puede agregar a la tabla después
      })
      .eq('id', pedidoId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, foto_url })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}