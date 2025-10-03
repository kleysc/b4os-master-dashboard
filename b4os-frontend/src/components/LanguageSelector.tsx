'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Globe, Check, ChevronDown } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

const languages = [
  { code: 'es', name: 'ES' },
  { code: 'en', name: 'EN' }
] as const

export default function LanguageSelector() {
  const { language, setLanguage, t } = useTranslation()
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

  const currentLanguage = languages.find(lang => lang.code === language)

  if (!mounted) {
    return (
      <div className="w-10 h-10 bg-white/10 rounded-lg animate-pulse"></div>
    )
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-white/10 p-2 rounded-lg transition-colors"
        title="Cambiar idioma / Change language"
      >
        <Globe className="w-4 h-4 text-white" />
        <span className="text-sm font-medium text-white hidden md:block">
          {currentLanguage?.name}
        </span>
        <ChevronDown className="w-3 h-3 text-white" />
      </button>

      {isOpen && mounted && createPortal(
        <>
          {/* Overlay para cerrar el dropdown */}
          <div
            className="fixed inset-0"
            style={{ zIndex: 999998 }}
            onClick={() => setIsOpen(false)}
          ></div>
          <div 
            className="fixed w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2 max-h-96 overflow-y-auto" 
            style={{ 
              zIndex: 999999,
              top: dropdownPosition.top,
              right: dropdownPosition.right
            }}
          >
            <div className="px-3 py-2 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900">Idioma / Language</p>
            </div>
            
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setLanguage(lang.code as 'es' | 'en')
                  setIsOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  language === lang.code
                    ? 'bg-orange-50 text-orange-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{lang.name}</span>
                <span className="flex-1 text-left font-medium">{lang.name}</span>
                {language === lang.code && (
                  <Check className="w-4 h-4 text-orange-600" />
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
