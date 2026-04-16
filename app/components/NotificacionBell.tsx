'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter, usePathname } from 'next/navigation'

function hoy() { return new Date().toISOString().split('T')[0] }

interface PedidoPendiente {
  id: string
  cliente: string
  sucursal_origen: string
  created_at: string
}

// Pages where the bell shouldn't show (login, etc.)
const HIDDEN_PATHS = ['/']

export default function NotificacionBell() {
  const router = useRouter()
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  const [pedidos, setPedidos] = useState<PedidoPendiente[]>([])
  const [open, setOpen] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  // Track auth state
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setLoggedIn(!!session?.user)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch pending pedidos for today
  const cargar = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('id, cliente, sucursal_origen, created_at')
      .eq('fecha_entrega', hoy())
      .in('estado', ['pendiente', 'conf_stock'])
      .order('created_at', { ascending: false })
      .limit(8)
    setPedidos(data ?? [])
    setCount((data ?? []).length)
  }

  useEffect(() => {
    if (!loggedIn) { setCount(0); setPedidos([]); return }
    cargar()
    const interval = setInterval(cargar, 2 * 60 * 1000) // refresh every 2 min
    return () => clearInterval(interval)
  }, [loggedIn])

  // Re-fetch when navigating between pages
  useEffect(() => {
    if (loggedIn) cargar()
  }, [pathname])

  if (!loggedIn || HIDDEN_PATHS.includes(pathname)) return null

  const hayNotificaciones = count > 0

  return (
    <div ref={ref} className="fixed z-[9999]" style={{ top: 10, right: 12 }}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center rounded-xl shadow-md"
        style={{
          width: 38, height: 38,
          background: open ? '#1a3a7a' : hayNotificaciones ? '#254A96' : '#e8edf8',
          transition: 'background 0.15s',
        }}
        title={hayNotificaciones ? `${count} pedido${count !== 1 ? 's' : ''} para hoy sin asignar` : 'Sin pedidos pendientes para hoy'}
      >
        <span style={{ fontSize: 17, lineHeight: 1, opacity: hayNotificaciones ? 1 : 0.45 }}>🔔</span>
        {hayNotificaciones && (
          <span
            className="absolute flex items-center justify-center rounded-full font-bold text-white"
            style={{
              top: -5, right: -5,
              minWidth: 18, height: 18,
              fontSize: 10,
              padding: '0 4px',
              background: '#E52322',
            }}
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute bg-white rounded-2xl shadow-2xl"
          style={{
            top: 46, right: 0,
            width: 288,
            border: '1px solid #e8edf8',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 15 }}>🔔</span>
              <span className="font-semibold text-sm" style={{ color: '#254A96' }}>Pedidos para hoy</span>
            </div>
            <span
              className="text-xs font-semibold rounded-full px-2 py-0.5"
              style={hayNotificaciones
                ? { background: '#fde8e8', color: '#E52322' }
                : { background: '#d1fae5', color: '#065f46' }}
            >
              {hayNotificaciones ? `${count} sin asignar` : 'Al día ✓'}
            </span>
          </div>

          {/* List */}
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {!hayNotificaciones && (
              <p className="px-4 py-5 text-sm text-center" style={{ color: '#B9BBB7' }}>
                No hay pedidos pendientes para hoy
              </p>
            )}
            {pedidos.map(p => (
              <div
                key={p.id}
                className="px-4 py-2.5"
                style={{ borderBottom: '1px solid #f9f9f9' }}
              >
                <p className="text-sm font-medium truncate" style={{ color: '#1a1a1a' }}>{p.cliente}</p>
                <p className="text-xs" style={{ color: '#B9BBB7' }}>
                  {p.sucursal_origen} · cargado{' '}
                  {new Date(p.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
            {count > 8 && (
              <p className="text-xs text-center py-2" style={{ color: '#B9BBB7' }}>
                y {count - 8} más…
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 flex gap-2 border-t" style={{ borderColor: '#f0f0f0' }}>
            <button
              onClick={() => { setOpen(false); router.push('/programacion') }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold text-white"
              style={{ background: '#254A96' }}
            >
              Ir a Programación
            </button>
            <button
              onClick={() => { setOpen(false); router.push('/pedidos') }}
              className="flex-1 py-2 rounded-lg text-xs font-semibold"
              style={{ background: '#f4f4f3', color: '#555' }}
            >
              Ver pedidos
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
