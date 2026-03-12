import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64
              }
            },
            {
              type: 'text',
              text: `Extraé los datos de esta Solicitud de Despacho y devolvé SOLO un JSON válido sin texto adicional:
{
  "nv": "número del campo Presupuesto 2 asociado (ej: 33555)",
  "id_despacho": "número del campo Solicitud de Despacho (ej: 28247)",
  "cliente": "nombre del cliente",
  "telefono": "teléfono o string vacío",
  "direccion": "dirección de entrega completa con ciudad y provincia",
  "barrio_cerrado": false,
  "productos": [
    {"id_producto": 1234, "descripcion": "nombre", "cantidad": 10}
  ]
}
No incluyas el producto 9024 Transporte ni el producto 312 Pallet. Solo el JSON, sin markdown.`
            }
          ]
        }
      ]
    })

    const texto = response.content[0].type === 'text' ? response.content[0].text : ''
    const limpio = texto.replace(/```json|```/g, '').trim()
    const datos = JSON.parse(limpio)

    return NextResponse.json({ success: true, datos })
  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}