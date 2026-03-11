'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

const VUELTAS = [
  { vuelta: 1, label: 'Vuelta 1 — 8:00 a 10:00hs' },
  { vuelta: 2, label: 'Vuelta 2 — 10:00 a 12:00hs' },
  { vuelta: 3, label: 'Vuelta 3 — 13:00 a 15:00hs' },
  { vuelta: 4, label: 'Vuelta 4 — 15:00 a 17:00hs' },
]

export default function NuevoDespacho() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cuposDisponibles, setCuposDisponibles] = useState<number[]>([])
  const [verificando, setVerificando] = useState(false)

  const [form, setForm] = useState({
    nv: '',
    id_despacho: '',
    cliente: '',
    telefono: '',
    direccion: '',
    sucursal: '',
    fecha_entrega: '',
    vuelta: '',
    estado_pago: '',
    notas: ''
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/')
    }
    checkUser()
  }, [])

  useEffect(() => {
    if (form.sucursal && form.fecha_entrega) {
      verificarCupos()
    } else {
      setCuposDisponibles([])
    }
  }, [form.sucursal, form.fecha_entrega])

  const verificarCupos = async () => {
    setVerificando(true)
    const disponibles: number[] = []

    for (const { vuelta } of VUELTAS) {
      const { count } = await supabase
        .from('pedidos')
        .select('*', { count: 'exact', head: true })
        .eq('sucursal', form.sucursal)
        .eq('fecha_entrega', form.fecha_entrega)
        .eq('vuelta', vuelta)
        .neq('estado', 'reprogramado')

      // Buscar configuracion de cupos para esa sucursal/fecha/vuelta
      const { data: cupo } = await supabase
        .from('cupos')
        .select('camiones_disponibles, pedidos_max_por_camion')
        .eq('sucursal', form.sucursal)
        .eq('fecha', form.fecha_entrega)
        .eq('vuelta', vuelta)
        .single()

      // Si no hay config de cupos, usar default (1 camion, 6 pedidos)
      const max = cupo
        ? cupo.camiones_disponibles * cupo.pedidos_max_por_camion
        : 6

      if ((count || 0) < max) {
        disponibles.push(vuelta)
      }
    }

    setCuposDisponibles(disponibles)
    setVerificando(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'sucursal' || e.target.name === 'fecha_entrega') {
      setForm(prev => ({ ...prev, [e.target.name]: e.target.value, vuelta: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.from('pedidos').insert({
      ...form,
      vuelta: parseInt(form.vuelta),
      vendedor_id: null,
      estado: 'pendiente'
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setExito(true)
    setLoading(false)
  }

  if (exito) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow p-8 text-center max-w-md">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Pedido cargado</h2>
        <p className="text-gray-500 mb-6">La solicitud de despacho fue registrada correctamente.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => {
            setExito(false)
            setForm({ nv: '', id_despacho: '', cliente: '', telefono: '', direccion: '', sucursal: '', fecha_entrega: '', vuelta: '', estado_pago: '', notas: '' })
          }} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition">
            Nuevo pedido
          </button>
          <button onClick={() => router.push('/dashboard')} className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition">
            Ir al panel
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Nueva Solicitud de Despacho</h1>
        <button onClick={() => router.push('/dashboard')} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Volver al panel
        </button>
      </nav>

      <main className="p-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nota de Venta (NV)</label>
              <input name="nv" value={form.nv} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: NV-12345" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ID Despacho</label>
              <input name="id_despacho" value={form.id_despacho} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Opcional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input name="cliente" value={form.cliente} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nombre del cliente" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input name="telefono" value={form.telefono} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: 221-555-1234" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de entrega</label>
            <input name="direccion" value={form.direccion} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Calle, número, localidad" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select name="sucursal" value={form.sucursal} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar...</option>
                <option value="LP520">La Plata — Depósito 520</option>
                <option value="LP139">La Plata — Depósito 139</option>
                <option value="Guernica">Guernica</option>
                <option value="Cañuelas">Cañuelas</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado de pago</label>
              <select name="estado_pago" value={form.estado_pago} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Seleccionar...</option>
                <option value="cobrado">Cobrado</option>
                <option value="cuenta_corriente">Cuenta corriente</option>
                <option value="pendiente_cobro">Pendiente de cobro</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega</label>
              <input type="date" name="fecha_entrega" value={form.fecha_entrega} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vuelta</label>
              <select name="vuelta" value={form.vuelta} onChange={handleChange} required className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={!form.sucursal || !form.fecha_entrega}>
                <option value="">
                  {!form.sucursal || !form.fecha_entrega ? 'Primero elegí sucursal y fecha' : verificando ? 'Verificando cupos...' : 'Seleccionar vuelta'}
                </option>
                {VUELTAS.map(({ vuelta, label }) => (
                  cuposDisponibles.includes(vuelta)
                    ? <option key={vuelta} value={vuelta}>{label}</option>
                    : <option key={vuelta} value={vuelta} disabled>{label} — SIN CUPO</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas adicionales</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" rows={3} placeholder="Instrucciones especiales, restricciones de acceso, etc." />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading || !form.vuelta} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Guardando...' : 'Confirmar solicitud de despacho'}
          </button>
        </form>
      </main>
    </div>
  )
}