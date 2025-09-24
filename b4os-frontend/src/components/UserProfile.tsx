'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { useState, useEffect, useRef } from 'react'
import { UserIcon, LogOutIcon, GithubIcon, ShieldIcon } from 'lucide-react'
import Image from 'next/image'
import { createPortal } from 'react-dom'
import { getRoleDisplayName, isAdmin } from '@/lib/github-roles'
import { logger } from '@/lib/logger'

export default function UserProfile() {
  const { data: session, status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right - window.scrollX
      })
    }
  }, [isOpen])

  // Debug logging
  logger.debug('UserProfile session loaded', { 
    hasSession: !!session, 
    userRole: session?.user?.role,
    isAdmin: isAdmin(session?.user?.role)
  })

  if (status === 'loading') {
    return (
      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
    )
  }

  if (!session) {
    return (
      <button
        onClick={() => signIn('github')}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
      >
        <GithubIcon className="w-4 h-4" />
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-lg transition-colors"
      >
        {session.user?.image ? (
          <Image 
            src={session.user.image} 
            alt={session.user.name || 'User'} 
            width={32}
            height={32}
            className="w-8 h-8 rounded-full border-2 border-white/20"
          />
        ) : (
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="text-sm font-medium text-white hidden md:block">
          {session.user?.name || 'User'}
        </span>
      </button>

      {isOpen && mounted && createPortal(
        <>
          {/* Overlay para cerrar el dropdown */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 99998 }}
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className="fixed w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-96 overflow-y-auto" 
            style={{ 
              zIndex: 99999,
              top: dropdownPosition.top,
              right: dropdownPosition.right
            }}
          >
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">{session.user?.name}</p>
              <p className="text-xs text-gray-500">{session.user?.email}</p>
              {session.user?.role && (
                <div className="flex items-center gap-1 mt-2">
                  <ShieldIcon className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">
                    {getRoleDisplayName(session.user.role)}
                  </span>
                </div>
              )}
            </div>


            <button
              onClick={() => {
                setIsOpen(false)
                signOut()
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
            >
              <LogOutIcon className="w-4 h-4" />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}