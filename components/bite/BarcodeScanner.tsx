'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void
  onClose: () => void
}

// Deduplicate: ignore same barcode for 2 seconds after it fires
const DEBOUNCE_MS = 2000

export default function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastCodeRef = useRef<string | null>(null)
  const lastTimeRef = useRef<number>(0)
  const [permError, setPermError] = useState(false)

  useEffect(() => {
    let controls: { stop: () => void } | null = null
    let cancelled = false

    async function start() {
      try {
        // Dynamic import so the lib is never bundled server-side
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')

        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.EAN_8,
          BarcodeFormat.EAN_13,
        ])
        hints.set(DecodeHintType.TRY_HARDER, true)

        const reader = new BrowserMultiFormatReader(hints)
        if (cancelled || !videoRef.current) return

        controls = await reader.decodeFromVideoDevice(
          undefined,          // let browser pick camera (prefers back on mobile)
          videoRef.current,
          (result) => {
            if (!result) return
            const code = result.getText()
            const now = Date.now()
            // Deduplicate same barcode within debounce window
            if (code === lastCodeRef.current && now - lastTimeRef.current < DEBOUNCE_MS) return
            lastCodeRef.current = code
            lastTimeRef.current = now
            onDetected(code)
          }
        )
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')) {
          setPermError(true)
        }
      }
    }

    start()
    return () => {
      cancelled = true
      controls?.stop()
    }
  }, [onDetected])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4">
        <p className="text-white font-semibold text-lg">Scan Barcode</p>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-90 transition-transform"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Viewfinder — box-shadow dims everything outside the scan window */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-72 h-44 rounded-2xl relative"
          style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
        >
          {/* Corner brackets */}
          <span className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
          <span className="absolute top-0 right-0 w-7 h-7 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
          <span className="absolute bottom-0 left-0 w-7 h-7 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
          <span className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
          {/* Scan line */}
          <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-[#10B981] rounded-full animate-pulse" />
        </div>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(env(safe-area-inset-bottom)+40px)] text-center">
        {permError ? (
          <div className="bg-red-900/80 rounded-2xl p-4">
            <p className="text-red-200 text-sm font-medium">Camera access denied</p>
            <p className="text-red-300/80 text-xs mt-1">Allow camera in your browser settings, then try again</p>
          </div>
        ) : (
          <p className="text-white/60 text-sm">Point camera at the barcode on a food package</p>
        )}
      </div>
    </div>
  )
}
