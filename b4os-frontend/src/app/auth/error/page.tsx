'use client'

import { useSearchParams } from 'next/navigation'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Suspense } from 'react'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'You are not authorized to access this system.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      default:
        return 'An error occurred during authentication. You may not be authorized to access this system.'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-lg p-2 mx-auto mb-4">
              <Image
                src="/web-app-manifest-192x192.png"
                alt="B4OS Logo"
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <div className="flex items-center gap-3 bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-100 font-medium">Access Denied</p>
                <p className="text-red-200 text-sm mt-1">
                  {getErrorMessage(error)}
                </p>
              </div>
            </div>

            {(error === 'AccessDenied' || !error) && (
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                <h3 className="text-blue-100 font-medium mb-2">¿Necesitas acceso?</h3>
                <p className="text-blue-200 text-sm">
                  Contacta con el administrador para ser agregado a la lista de usuarios autorizados del sistema B4OS.
                </p>
                <p className="text-blue-200 text-xs mt-2 opacity-80">
                  Solo usuarios previamente autorizados pueden acceder al dashboard.
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Try Again
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-3 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </Link>
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <p className="text-gray-400 text-xs font-mono">
                Error Code: {error}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}