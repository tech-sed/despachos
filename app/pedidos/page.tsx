'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

const SUCURSALES = ['LP520', 'LP139', 'Guernica', 'Cañuelas', 'Pinamar']
const ESTADOS = ['pendiente', 'programado', 'en_camino', 'entregado', 'cancelado']
const VUELTAS = [1, 2, 3, 4]

const ESTADO_COLOR: Record<string, string> = {
  pendiente: '#f59e0b',
  programado: '#3b82f6',
  en_camino: '#8b5cf6',
  entregado: '#10b981',
  cancelado: '#ef4444',
}
const ESTADO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', programado: 'Programado', en_camino: 'En camino',
  entregado: 'Entregado', cancelado: 'Cancelado',
}

interface Pedido {
  id: string; nv: string; cliente: string; direccion: string
  sucursal: string; fecha_entrega: string; vuelta: number
  estado: string; peso_total_kg: number | null; volumen_total_m3: number | null
  notas: string | null; camion_id: string | null
}

export default function PedidosPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(false)
  const [total, setTotal] = useState(0)

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState('')
  const [filtroSucursal, setFiltroSucursal] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroTexto, setFiltroTexto] = useState('')

  // Edición de sucursal inline
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editSucursal, setEditSucursal] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [toast, setToast] = useState<{ msg: string; tipo: 'ok' | 'err' } | null>(null)
  const showToast = (msg: string, tipo: 'ok' | 'err' = 'ok') => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/'); return }
      supabase.from('usuarios').select('rol').eq('id', user.id).single().then(({ data }) => {
        if (!['gerencia', 'ruteador', 'admin_flota'].includes(data?.rol)) {
          router.push('/dashboard'); return
        }
      })
    })
  }, [])

  async function buscar() {
    setCargando(true)
    let q = supabase
      .from('pedidos')
      .select('id, nv, cliente, direccion, sucursal, fecha_entrega, vuelta, estado, peso_total_kg, volumen_total_m3, notas, camion_id', { count: 'exact' })
      .order('fecha_entrega', { ascending: false })
      .order('cliente')
      .limit(200)

    if (filtroFecha) q = q.eq('fecha_entrega', filtroFecha)
    if (filtroSucursal) q = q.eq('sucursal', filtroSucursal)
    if (filtroEstado) q = q.eq('estado', filtroEstado)
    if (filtroTexto) {
      const txt = `%${filtroTexto}%`
      q = q.or(`cliente.ilike.${txt},nv.ilike.${txt},direccion.ilike.${txt}`)
    }

    const { data, count, error } = await q
    if (error) { showToast(error.message, 'err') }
    else { setPedidos(data ?? []); setTotal(count ?? 0) }
    setCargando(false)
  }

  function iniciarEdicion(p: Pedido) {
    setEditandoId(p.id)
    setEditSucursal(p.sucursal)
  }

  async function guardarSucursal(id: string) {
    setGuardando(true)
    const res = await fetch('/api/pedidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, sucursal: editSucursal }),
    })
    const data = await res.json()
    if (data.error) {
      showToast(data.error, 'err')
    } else {
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, sucursal: editSucursal } : p))
      showToast('Sucursal actualizada')
      setEditandoId(null)
    }
    setGuardando(false)
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: 'Barlow, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2"
          style={{ background: toast.tipo === 'ok' ? '#254A96' : '#E52322' }}>
          {toast.tipo === 'ok' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-40" style={{ borderColor: '#e8edf8' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')}
              className="text-xs px-2 py-1.5 rounded-lg font-medium"
              style={{ background: '#e8edf8', color: '#254A96' }}>
              ← Volver
            </button>
            <div>
              <span className="font-bold text-sm" style={{ color: '#254A96' }}>Pedidos</span>
              {total > 0 && <span className="text-xs ml-2" style={{ color: '#B9BBB7' }}>{total} resultado{total !== 1 ? 's' : ''}</span>}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-5">

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#254A96' }}>Fecha entrega</label>
              <input type="date" value={filtroFecha} onChange={e => setFiltroFecha(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e8edf8' }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#254A96' }}>Sucursal</label>
              <select value={filtroSucursal} onChange={e => setFiltroSucursal(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e8edf8' }}>
                <option value="">Todas</option>
                {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#254A96' }}>Estado</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e8edf8' }}>
                <option value="">Todos</option>
                {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#254A96' }}>Cliente / NV / dirección</label>
              <input type="text" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && buscar()}
                placeholder="Buscar..." className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{ borderColor: '#e8edf8' }} />
            </div>
          </div>
          <button onClick={buscar} disabled={cargando}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: '#254A96' }}>
            {cargando ? 'Buscando...' : 'Buscar'}
          </button>
        </div>

        {/* Tabla */}
        {pedidos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f4f4f3', borderBottom: '1px solid #e8edf8' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#254A96' }}>NV</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>Dirección</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#254A96' }}>Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>V.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>Sucursal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap" style={{ color: '#254A96' }}>Kg / Pos</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: '#254A96' }}>Camión</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: i < pedidos.length - 1 ? '1px solid #f4f4f3' : 'none' }}>
                    <td className="px-4 py-2.5 font-medium whitespace-nowrap" style={{ color: '#1a1a1a' }}>{p.nv}</td>
                    <td className="px-4 py-2.5 max-w-[180px] truncate" style={{ color: '#1a1a1a' }} title={p.cliente}>{p.cliente}</td>
                    <td className="px-4 py-2.5 max-w-[200px] truncate text-xs" style={{ color: '#666' }} title={p.direccion}>{p.direccion}</td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#666' }}>
                      {p.fecha_entrega ? new Date(p.fecha_entrega + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#666' }}>V{p.vuelta}</td>
                    <td className="px-4 py-2.5">
                      {editandoId === p.id ? (
                        <div className="flex items-center gap-1">
                          <select value={editSucursal} onChange={e => setEditSucursal(e.target.value)}
                            className="border rounded-lg px-2 py-1 text-xs focus:outline-none"
                            style={{ borderColor: '#254A96' }}>
                            {SUCURSALES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => guardarSucursal(p.id)} disabled={guardando}
                            className="text-xs px-2 py-1 rounded-lg font-semibold text-white"
                            style={{ background: '#254A96' }}>
                            {guardando ? '...' : '✓'}
                          </button>
                          <button onClick={() => setEditandoId(null)}
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{ background: '#f4f4f3', color: '#666' }}>
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => iniciarEdicion(p)}
                          className="text-xs px-2 py-1 rounded-lg hover:opacity-80"
                          style={{ background: '#e8edf8', color: '#254A96' }}>
                          {p.sucursal}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                        style={{ background: ESTADO_COLOR[p.estado] ?? '#999' }}>
                        {ESTADO_LABEL[p.estado] ?? p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: '#666' }}>
                      {p.peso_total_kg != null ? `${p.peso_total_kg.toLocaleString('es-AR')} kg` : '—'}
                      {p.volumen_total_m3 != null ? ` / ${p.volumen_total_m3} pos` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: '#B9BBB7' }}>{p.camion_id ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {total > 200 && (
              <p className="text-xs text-center py-3" style={{ color: '#B9BBB7' }}>
                Mostrando los primeros 200 de {total} resultados. Refiná los filtros para ver más.
              </p>
            )}
          </div>
        )}

        {!cargando && pedidos.length === 0 && (
          <div className="text-center py-20" style={{ color: '#B9BBB7' }}>
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">Aplicá filtros y hacé clic en Buscar</p>
          </div>
        )}
      </main>
    </div>
  )
}
