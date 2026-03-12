'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

function asignarSucursal(lat: number, lng: number, tieneProductosTernium: boolean): string {
  if (tieneProductosTernium) return 'Cañuelas'
  const sucursales = [
    { id: 'LP520', lat: -34.9214, lng: -57.9544 },
    { id: 'LP139', lat: -34.9214, lng: -57.9544 },
    { id: 'Guernica', lat: -34.9897, lng: -58.3756 },
    { id: 'Cañuelas', lat: -35.0516, lng: -58.7312 },
  ]
  let minDist = Infinity
  let sucursal = 'LP520'
  for (const s of sucursales) {
    const dLat = (s.lat - lat) * Math.PI / 180
    const dLng = (s.lng - lng) * Math.PI / 180
    const a = Math.sin(dLat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(s.lat*Math.PI/180)*Math.sin(dLng/2)**2
    const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    if (d < minDist) { minDist = d; sucursal = s.id }
  }
  return sucursal
}

export default function Programacion() {
  const router = useRouter()
  const [procesando, setProcesando] = useState(false)
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [importadas, setImportadas] = useState(0)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/')
    }
    checkUser()
  }, [])

  const handleExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setProcesando(true)
    setError('')
    setSolicitudes([])

    const formData = new FormData()
    formData.append('excel', file)

    try {
      const res = await fetch('/api/leer-excel', { method: 'POST', body: formData })
      const data = await res.json()

      if (!data.success) {
        setError(data.error || 'Error al procesar el Excel')
        setProcesando(false)
        return
      }

      const procesadas = data.rows.map((row: any) => {
        const tieneProductosTernium = /chapa|perfil|ternium/i.test(row.descripcion || '')
        const sucursal = (row.lat && row.lng) ? asignarSucursal(row.lat, row.lng, tieneProductosTernium) : ''
        return { ...row, sucursal, tieneProductosTernium, sinGeo: !row.lat || !row.lng }
      })

      setSolicitudes(procesadas)
    } catch (err: any) {
      setError(err.message)
    }

    setProcesando(false)
  }

  const confirmarImportacion = async () => {
    setProcesando(true)
    let ok = 0

    for (const s of solicitudes) {
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('id')
        .eq('id_despacho', s.nro_sd)
        .single()

      if (pedido) {
        await supabase.from('pedidos').update({
          latitud: s.lat,
          longitud: s.lng,
          deposito_origen: s.sucursal,
          sucursal: s.sucursal,
        }).eq('id', pedido.id)
        ok++
      }
    }

    setImportadas(ok)
    setListo(true)
    setProcesando(false)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Programación de Despachos</h1>
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al panel
        </button>
      </nav>

      <main className="p-6 max-w-5xl mx-auto space-y-4">

        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">📥 Importar Excel de Huemul</h2>
          <p className="text-sm text-gray-500 mb-4">Subí el export diario de solicitudes de despacho.</p>
          <input type="file" accept=".xlsx,.xls" onChange={handleExcel}
            className="w-full border border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 cursor-pointer hover:border-blue-400 transition" />
          {procesando && <p className="text-blue-500 text-sm mt-2">⏳ Procesando...</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {solicitudes.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-700">{solicitudes.length} solicitudes detectadas</h2>
              <div className="flex gap-3 text-sm">
                {solicitudes.filter(s => s.sinGeo).length > 0 && (
                  <span className="text-orange-500">⚠️ {solicitudes.filter(s => s.sinGeo).length} sin geo</span>
                )}
                {solicitudes.filter(s => s.tieneProductosTernium).length > 0 && (
                  <span className="text-blue-500">🏭 {solicitudes.filter(s => s.tieneProductosTernium).length} Ternium</span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4">SD #</th>
                    <th className="pb-2 pr-4">Cliente</th>
                    <th className="pb-2 pr-4">Dirección</th>
                    <th className="pb-2 pr-4">Sucursal</th>
                    <th className="pb-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-2 pr-4 font-medium">{s.nro_sd}</td>
                      <td className="py-2 pr-4">{s.cliente}</td>
                      <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">{s.direccion}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          s.sucursal === 'Cañuelas' ? 'bg-blue-100 text-blue-700' :
                          s.sucursal === 'Guernica' ? 'bg-green-100 text-green-700' :
                          s.sucursal === 'LP520' ? 'bg-purple-100 text-purple-700' :
                          s.sucursal === 'LP139' ? 'bg-pink-100 text-pink-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {s.sucursal || 'Sin asignar'}
                        </span>
                      </td>
                      <td className="py-2 text-xs">
                        {s.tieneProductosTernium && <span className="text-blue-500">🏭 Ternium</span>}
                        {s.sinGeo && <span className="text-orange-500 ml-1">📍 Sin geo</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={confirmarImportacion} disabled={procesando}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {procesando ? 'Importando...' : 'Confirmar importación'}
              </button>
            </div>
          </div>
        )}

        {listo && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-700">
            ✅ Importación completa — {importadas} pedidos actualizados.
          </div>
        )}
      </main>
    </div>
  )
}
