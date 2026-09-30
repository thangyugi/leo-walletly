'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Loader2, User, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ProfileAvatarProps {
  currentUrl?: string | null
  onUpload: (file: File) => Promise<void>
  onDelete?: () => Promise<void>
}

export function ProfileAvatar({ currentUrl, onUpload, onDelete }: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsUploading(true)
    setUploadProgress(10) // Initial progress
    
    try {
      // Simulate progress for better UX
      const interval = setInterval(() => {
        setUploadProgress(prev => (prev < 90 ? prev + 10 : prev))
      }, 100)

      await onUpload(file)
      
      clearInterval(interval)
      setUploadProgress(100)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp'] },
    maxFiles: 1,
    disabled: isUploading
  })

  return (
    <div className="flex items-center gap-6">
      <div className="relative group">
        <div 
          {...getRootProps()} 
          className={cn(
            "relative w-24 h-24 rounded-full overflow-hidden border-2 border-[var(--color-border-subtle)] transition-all",
            "bg-[var(--color-bg-sunken)] flex items-center justify-center cursor-pointer",
            isDragActive && "border-[var(--color-interactive-primary)] scale-105",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />
          
          {currentUrl ? (
            <img 
              src={currentUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-10 h-10 text-[var(--color-text-quaternary)]" />
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
            <span className="text-[10px] text-white font-medium mt-1">Change</span>
          </div>

          {/* Uploading Progress */}
          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[var(--color-bg-base)]/80 flex items-center justify-center"
              >
                <div className="relative w-16 h-16">
                   <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      className="text-[var(--color-border-subtle)]"
                    />
                    <motion.circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={175}
                      strokeDashoffset={175 - (175 * uploadProgress) / 100}
                      className="text-[var(--color-interactive-primary)]"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                    {uploadProgress}%
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {currentUrl && !isUploading && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border border-[var(--color-border-default)] shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">Profile photo</h4>
        <p className="text-xs text-[var(--color-text-tertiary)]">
          PNG, JPG or WebP. Max 5MB.
        </p>
        <div className="flex gap-3 mt-2">
          <button 
            {...getRootProps()}
            className="text-xs font-semibold text-[var(--color-interactive-primary)] hover:underline"
          >
            Upload new image
          </button>
          {currentUrl && (
            <button 
              onClick={onDelete}
              className="text-xs font-semibold text-red-600 hover:underline"
            >
              Remove photo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
