'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void
  disabled?: boolean
  label?: string
  accept?: string
}

export default function ImageUploader({
  onImageSelected,
  disabled = false,
  label = 'Take a photo or upload from library',
  accept = 'image/*',
}: ImageUploaderProps) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    onImageSelected(file, url)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset so the same file can be selected again
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-3xl border-2 border-dashed flex flex-col items-center justify-center py-14 px-6 text-center transition-all duration-150',
          dragging
            ? 'border-wine bg-wine-muted/30'
            : 'border-border hover:border-border-strong',
          disabled && 'opacity-50 pointer-events-none'
        )}
      >
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-5">
          <ImageIcon className="w-8 h-8 text-text-secondary" strokeWidth={1.5} />
        </div>
        <p className="text-text-secondary text-sm leading-relaxed mb-1">{label}</p>
        <p className="text-text-tertiary text-xs">JPEG, PNG, HEIC — up to 10MB</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* Camera — opens directly to camera on iPhone */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
          className="btn-primary flex items-center justify-center gap-2 py-4"
        >
          <Camera className="w-5 h-5" />
          Camera
        </button>

        {/* Library */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => libraryRef.current?.click()}
          className="btn-secondary flex items-center justify-center gap-2 py-4"
        >
          <Upload className="w-5 h-5" />
          Library
        </button>
      </div>

      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept={accept}
        capture="environment"   // rear camera on mobile
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={libraryRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  )
}
