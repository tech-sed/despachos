import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: NextRequest) {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Este PDF contiene múltiples Solicitudes de Despacho. Extraé TODAS las solicitudes y devolvé SOLO un JSON array válido sin texto adicional ni markdown.

Para cada solicitud extraé:
{
  "id_despacho": "número de la solicitud sin el # (ej: 30057)",
  "nv": "número del Presupuesto 2 asociado sin el # (ej: 30689)",
  "cliente": "nombre del cliente",
  "telefono": "teléfono del contacto de obra, o string vacío si dice Sin contacto o Sin especificar",
  "direccion": "dirección de entrega completa",
  "deposito": "nombre del depósito de salida (ej: CAC LA PLATA - DEPOSITO 520)",
  "sucursal_obra": "sucursal de la obra exactamente como figura en el PDF (ej: La Plata - 520, Guernica, Cañuelas, Pinamar)",
  "latitud": número o null,
  "longitud": número o null,
  "horario": "Mañana" o "Tarde",
  "prioridad_texto": "Normal" o "Alta" o "Urgente",
  "productos": [{"descripcion": "nombre exacto del producto", "cantidad": número}]
}

No incluyas en productos los que tengan "Transporte" en el nombre.
Devolvé SOLO el JSON array, sin markdown, sin texto adicional.`,
            },
          ],
        },
      ],
    })

    const texto = response.content[0].type === 'text' ? response.content[0].text : ''
    const limpio = texto.replace(/```json\n?|```\n?/g, '').trim()
    const solicitudes = JSON.parse(limpio)

    return NextResponse.json({ success: true, solicitudes })
  } catch (error: any) {
    console.error('leer-masivo error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
