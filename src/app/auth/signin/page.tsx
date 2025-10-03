'use client'

import { signIn, getProviders } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { GithubIcon } from 'lucide-react'

interface Provider {
  id: string
  name: string
}

export default function SignIn() {
  const [providers, setProviders] = useState<Record<string, Provider> | null>(null)

  useEffect(() => {
    const setAuthProviders = async () => {
      const res = await getProviders()
      setProviders(res)
    }
    setAuthProviders()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8 border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-lg p-2 mx-auto mb-4">
              <img 
                src="https://res.cloudinary.com/dkuwkpihs/image/upload/v1758759628/web-app-manifest-192x192_dkecn9.png" 
                alt="B4OS Logo" 
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">B4OS Challenges</h1>
            <p className="text-gray-300">Sign in to start your Bitcoin development journey</p>
          </div>

          {/* GitHub Sign In */}
          {providers && (
            <div className="space-y-4">
              {Object.values(providers).map((provider: Provider) => (
                <div key={provider.name}>
                  <button
                    onClick={() => signIn(provider.id, { callbackUrl: '/' })}
                    className="w-full flex items-center justify-center gap-3 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-lg transition-colors border border-gray-700"
                  >
                    <GithubIcon className="w-5 h-5" />
                    Continue with {provider.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              By signing in, you agree to participate in the B4OS technical assessment program.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}