'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [usuario, setUsuario] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUsuario(user)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!usuario) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Construyo al Costo — Despachos</h1>
        <div className="flex items-center gap-4">
          <span className="text-gray-600 text-sm">{usuario.email}</span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600 transition"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      <main className="p-6">
        <h2 className="text-2xl font-bold text-gray-700 mb-6">Panel principal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-700">📦 Nuevo despacho</h3>
            <p className="text-gray-500 text-sm mt-2">Cargar una nueva solicitud de entrega</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-700">📅 Programación</h3>
            <p className="text-gray-500 text-sm mt-2">Ver y gestionar los cupos del día</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-700">🚚 Ruteo</h3>
            <p className="text-gray-500 text-sm mt-2">Asignar pedidos a camiones</p>
          </div>
          <div className="bg-white rounded-xl shadow p-6 cursor-pointer hover:shadow-md transition">
            <h3 className="text-lg font-semibold text-gray-700">📊 Métricas</h3>
            <p className="text-gray-500 text-sm mt-2">KPIs y estadísticas de entregas</p>
          </div>
        </div>
      </main>
    </div>
  )
}