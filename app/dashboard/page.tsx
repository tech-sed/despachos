'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

const CARDS = [
  {
    href: '/despachos',
    emoji: '📦',
    titulo: 'Nuevo despacho',
    descripcion: 'Cargar solicitud desde PDF',
    color: 'border-blue-400',
    bg: 'hover:bg-blue-50',
    disponible: true,
  },
  {
    href: '/flota',
    emoji: '🚛',
    titulo: 'Flota del día',
    descripcion: 'Configurar camiones disponibles',
    color: 'border-orange-400',
    bg: 'hover:bg-orange-50',
    disponible: true,
  },
  {
    href: '/programacion',
    emoji: '📅',
    titulo: 'Programación',
    descripcion: 'Asignar pedidos a camiones',
    color: 'border-purple-400',
    bg: 'hover:bg-purple-50',
    disponible: true,
  },
  {
    href: '/ruteo',
    emoji: '🗺️',
    titulo: 'Ruteo',
    descripcion: 'Hoja de ruta por chofer',
    color: 'border-green-400',
    bg: 'hover:bg-green-50',
    disponible: false,
  },
  {
    href: '/metricas',
    emoji: '📊',
    titulo: 'Métricas',
    descripcion: 'KPIs y estadísticas',
    color: 'border-pink-400',
    bg: 'hover:bg-pink-50',
    disponible: false,
  },
]

const ESTADO_COLOR: Record<string, string> = {
  pendiente:   'bg-yellow-100 text-yellow-700',
  programado:  'bg-blue-100 text-blue-700',
  en_camino:   'bg-purple-100 text-purple-700',
  entregado:   'bg-green-100 text-green-700',
  cancelado:   'bg-red-100 text-red-700',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente:   'Pendiente',
  programado:  'Programado',
  en_camino:   'En camino',
  entregado:   'Entregado',
  cancelado:   'Cancelado',
}

interface PedidoReciente {
  id: string
  nv: string
  cliente: string
  sucursal: string
  estado: string
  fecha_entrega: string
  vuelta: number
}

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null)
  const [stats, setStats] = useState({ pendientes: 0, hoy: 0, enCamino: 0, entregadosHoy: 0 })
  const [recientes, setRecientes] = useState<PedidoReciente[]>([])
  const [cargando, setCargando] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUsuario(user)
    }
    getUser()
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const hoy = new Date().toISOString().split('T')[0]

    const [{ count: pendientes }, { count: hoyCount }, { count: enCamino }, { count: entregadosHoy }, { data: recientesData }] =
      await Promise.all([
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('fecha_entrega', hoy),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'en_camino'),
        supabase.from('pedidos').select('*', { count: 'exact', head: true }).eq('estado', 'entregado').eq('fecha_entrega', hoy),
        supabase.from('pedidos').select('id, nv, cliente, sucursal, estado, fecha_entrega, vuelta').order('created_at', { ascending: false }).limit(8),
      ])

    setStats({
      pendientes: pendientes || 0,
      hoy: hoyCount || 0,
      enCamino: enCamino || 0,
      entregadosHoy: entregadosHoy || 0,
    })
    setRecientes(recientesData || [])
    setCargando(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!usuario || cargando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="text-gray-400 text-sm">Cargando...</p>
    </div>
  )

  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  const nombre = usuario.email?.split('@')[0] || 'usuario'

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Nav */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white font-bold text-lg px-3 py-1 rounded-lg">CaC</div>
          <div>
            <h1 className="text-lg font-bold text-gray-800 leading-tight">Construyo al Costo</h1>
            <p className="text-xs text-gray-400">Sistema de despachos</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-500 text-sm hidden md:block">{usuario.email}</span>
          <button onClick={handleLogout} className="text-sm bg-red-50 text-red-500 hover:bg-red-100 px-3 py-1.5 rounded-lg transition">
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="p-6 max-w-7xl mx-auto">

        {/* Saludo */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{saludo}, {nombre} 👋</h2>
          <p className="text-gray-400 text-sm mt-1">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="bg-yellow-100 text-2xl p-3 rounded-lg">⏳</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.pendientes}</p>
              <p className="text-xs text-gray-400">Pendientes</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="bg-blue-100 text-2xl p-3 rounded-lg">📅</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.hoy}</p>
              <p className="text-xs text-gray-400">Entregas hoy</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="bg-purple-100 text-2xl p-3 rounded-lg">🚚</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.enCamino}</p>
              <p className="text-xs text-gray-400">En camino</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 flex items-center gap-4">
            <div className="bg-green-100 text-2xl p-3 rounded-lg">✅</div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.entregadosHoy}</p>
              <p className="text-xs text-gray-400">Entregados hoy</p>
            </div>
          </div>
        </div>

        {/* Layout dos columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Columna izquierda — módulos */}
          <div className="lg:col-span-1">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Módulos</h3>
            <div className="space-y-3">
              {CARDS.map(card => (
                <div
                  key={card.href}
                  onClick={() => card.disponible && router.push(card.href)}
                  className={`bg-white rounded-xl shadow p-4 border-l-4 ${card.color} flex items-center gap-4 transition
                    ${card.disponible
                      ? `cursor-pointer ${card.bg} hover:shadow-md`
                      : 'opacity-50 cursor-not-allowed'
                    }`}
                >
                  <div className="text-2xl">{card.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-800 text-sm">{card.titulo}</h3>
                      {!card.disponible && (
                        <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Próximamente</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs mt-0.5">{card.descripcion}</p>
                  </div>
                  {card.disponible && (
                    <span className="text-gray-300 text-lg">›</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Columna derecha — actividad reciente */}
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actividad reciente</h3>
            <div className="bg-white rounded-xl shadow overflow-hidden">
              {recientes.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-sm">No hay pedidos cargados todavía</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cliente</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">NV</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sucursal</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Entrega</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recientes.map((p, i) => (
                      <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 transition ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                        <td className="px-4 py-3 font-medium text-gray-800 truncate max-w-[160px]">{p.cliente}</td>
                        <td className="px-4 py-3 text-gray-500">{p.nv}</td>
                        <td className="px-4 py-3 text-gray-500">{p.sucursal}</td>
                        <td className="px-4 py-3 text-gray-500">
                          {new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                          <span className="ml-1 text-gray-400">V{p.vuelta}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_COLOR[p.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                            {ESTADO_LABEL[p.estado] ?? p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}