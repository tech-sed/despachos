import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('excel') as File

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

    console.log('Columnas:', Object.keys(rawRows[0] || {}))

    const rows = rawRows.map((row: any) => ({
  nro_sd: String(row['id'] || ''),
  cliente: String(row['cliente'] || row['destino_de_venta'] || ''),
  direccion: String(row['direccion_obra'] || ''),
  ciudad: '',
  lat: parseFloat(String(row['latitud'] || '')) || null,
  lng: parseFloat(String(row['longitud'] || '')) || null,
  descripcion: '',
  fecha: String(row['fecha_despacho'] || ''),
  sucursal_huemul: String(row['sucursal'] || ''),
  prioridad: String(row['prioridad'] || ''),
  horario: String(row['horario_entrega'] || ''),
  id_venta: String(row['id_venta'] || ''),
})).filter(r => r.nro_sd)
    return NextResponse.json({ success: true, rows })
  } catch (error: any) {
    console.error('Error Excel:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}