'use client'

import { useSession } from "next-auth/react"
import { ReactNode, useEffect, useRef } from "react"
import Image from "next/image"
import UserProfile from "@/components/UserProfile"
import { RefreshCwIcon } from "lucide-react"

interface ProtectedContentProps {
  children: ReactNode
}

export default function ProtectedContent({ children }: ProtectedContentProps) {
  const { data: session, status } = useSession()
  const prevStatusRef = useRef<string>()

  // Debug info only on status change - prevents infinite loops
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      console.log("ProtectedContent status change:", {
        status,
        hasSession: !!session,
        isAuthorized: session?.user?.isAuthorized,
        user: session?.user
      });
      prevStatusRef.current = status
    }
  }, [status, session])

  // Mostrar loading mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <RefreshCwIcon className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-white">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Mostrar pantalla de no autenticado
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          {/* Logo */}
          <div className="w-24 h-24 bg-white rounded-2xl p-3 flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Image
              src="/web-app-manifest-192x192.png"
              alt="B4OS Logo"
              width={72}
              height={72}
              className="w-18 h-18 object-contain"
            />
          </div>
          
          {/* Título */}
          <h1 className="text-5xl font-bold bg-gradient-to-r from-white via-orange-100 to-orange-300 bg-clip-text text-transparent mb-6">
            B4OS Dashboard
          </h1>
          
          {/* Subtítulo */}
          <p className="text-xl text-gray-300 mb-2 font-medium">
            Programa Bitcoin 4 Open Source
          </p>
          
          {/* Descripción */}
          <p className="text-gray-400 mb-10 leading-relaxed">
            Accede con tu cuenta de GitHub autorizada para ver el ranking de estudiantes, estadísticas del programa y monitorear el progreso en tiempo real.
          </p>
          
          <div className="flex justify-center">
            <UserProfile />
          </div>
          
        </div>
      </div>
    )
  }

  // Verificar si el usuario está autorizado
  if (!session.user?.isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-lg mx-auto px-6">
          {/* Logo */}
          <div className="w-24 h-24 bg-white rounded-2xl p-3 flex items-center justify-center shadow-2xl mx-auto mb-8">
            <Image
              src="/web-app-manifest-192x192.png"
              alt="B4OS Logo"
              width={72}
              height={72}
              className="w-18 h-18 object-contain"
            />
          </div>
          
          {/* Título */}
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-red-300 to-red-200 bg-clip-text text-transparent mb-6">
            Acceso No Autorizado
          </h1>
          
          {/* Subtítulo */}
          <p className="text-xl text-gray-300 mb-2 font-medium">
            Cuenta no autorizada
          </p>
          
          {/* Descripción */}
          <div className="text-gray-400 mb-10 leading-relaxed space-y-4">
            <p>
              Tu cuenta de GitHub <span className="text-orange-400 font-semibold">@{session.user?.username}</span> no está autorizada para acceder al dashboard B4OS.
            </p>
            <p className="text-sm">
              Si crees que esto es un error, contacta al administrador del sistema.
            </p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => window.location.href = '/api/auth/signout'}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors duration-200"
            >
              Cerrar Sesión
            </button>
          </div>
          
        </div>
      </div>
    )
  }

  // Mostrar contenido protegido si hay sesión
  return <>{children}</>
}
