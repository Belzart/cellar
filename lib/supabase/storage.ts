import { createServiceClient } from './server'

/**
 * Generate a signed URL for a file in the cellar-images bucket.
 * Uses the service role client so it works server-side regardless of RLS.
 *
 * @param storagePath  Path inside the bucket (e.g. "user_id/label/file.jpg")
 * @param expiresIn    URL TTL in seconds (default 1 hour)
 */
export async function getSignedImageUrl(
  storagePath: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!storagePath) return null
  try {
    const client = createServiceClient()
    const { data } = await client.storage
      .from('cellar-images')
      .createSignedUrl(storagePath, expiresIn)
    return data?.signedUrl ?? null
  } catch {
    return null
  }
}
