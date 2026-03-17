'use server'

import { createClient } from '@/lib/supabase/server'
import { ImageType } from '@/lib/types'

// ── Upload image to Supabase Storage ──────────────────────
// Returns the stored image record id and signed URL.
// Folder structure: {user_id}/{type}/{timestamp}-{filename}
export async function uploadImage(
  formData: FormData
): Promise<{ imageId: string; storagePath: string; signedUrl: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File
  const type = (formData.get('type') as ImageType) ?? 'label'

  if (!file || file.size === 0) throw new Error('No file provided')
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large (max 10MB)')

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    throw new Error('Unsupported file type')
  }

  const timestamp = Date.now()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const filename = `${timestamp}.${ext}`
  const storagePath = `${user.id}/${type}/${filename}`

  // Upload to storage
  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('cellar-images')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type || 'image/jpeg',
      upsert: false,
    })

  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  // Create uploaded_images record
  const { data: imageRecord, error: dbError } = await supabase
    .from('uploaded_images')
    .insert({
      user_id: user.id,
      type,
      storage_path: storagePath,
      storage_bucket: 'cellar-images',
      original_filename: file.name,
      mime_type: file.type || 'image/jpeg',
      file_size_bytes: file.size,
    })
    .select('id')
    .single()

  if (dbError || !imageRecord) throw new Error(`DB insert failed: ${dbError?.message}`)

  // Get a signed URL (1 hour — enough for the review flow)
  const { data: signed } = await supabase.storage
    .from('cellar-images')
    .createSignedUrl(storagePath, 3600)

  return {
    imageId: imageRecord.id,
    storagePath,
    signedUrl: signed?.signedUrl ?? '',
  }
}

// ── Get a signed URL for an existing image ────────────────
export async function getSignedUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('cellar-images')
    .createSignedUrl(storagePath, expiresIn)
  return data?.signedUrl ?? ''
}
