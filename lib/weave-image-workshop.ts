import { getPool } from '@/lib/db'

export const IMAGE_STYLES = {
  general: 'Follow the subject and instructions precisely with a thoughtful, professional composition.',
  photographic: 'Photorealistic professional photography: believable anatomy, natural materials, detailed lighting and realistic lens behavior.',
  cinematic: 'Premium cinematic 3D render: atmospheric depth, carefully designed environments, realistic material surfaces and lighting.',
  product: 'Commercial product photography: precise product shape, material fidelity, clean professional lighting and compelling composition.',
  architecture: 'Architectural visualization: accurate perspective, coherent spaces, materials and construction details.',
  illustration: 'Rich editorial illustration: expressive shapes, deliberate palette, layered detail and a refined finish.',
  anime: 'High-quality anime-inspired original character illustration with coherent details, dynamic composition and polished color.',
  advertising: 'Professionally art-directed advertising visual with intentional focal points, clean hierarchy and legible wording when requested.',
  infographic: 'Visually clear infographic or educational diagram with disciplined hierarchy, accurate labels and readable text.',
  branding: 'Distinctive original visual identity suitable for logos, brand marks or campaign assets, with clean geometry.',
} as const

export type ImageStyle = keyof typeof IMAGE_STYLES
export type ImageFormat = 'png' | 'webp' | 'jpeg' | 'gif' | 'svg'
export type ImageModelChoice = 'detail' | 'fast'
export type ImageAspect = 'square' | 'portrait' | 'landscape'

export const IMAGE_FORMATS: ImageFormat[] = ['png', 'webp', 'jpeg', 'gif', 'svg']
export const IMAGE_ASPECTS: ImageAspect[] = ['square', 'portrait', 'landscape']
export const IMAGE_QUALITIES = ['low', 'medium', 'high'] as const
export const IMAGE_COMPLEXITIES = ['low', 'medium', 'high'] as const

export const IMAGE_MIME: Record<ImageFormat, string> = {
  png: 'image/png', webp: 'image/webp', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'text/plain; charset=utf-8',
}

export function imageSize(aspect: ImageAspect, format: ImageFormat) {
  if (format === 'gif' || format === 'svg') return 'auto'
  if (aspect === 'portrait') return '1024x1536'
  if (aspect === 'landscape') return '1536x1024'
  return '1024x1024'
}

export function imageDailyLimit(role: string) {
  const defaultLimit = role === 'admin' ? 10 : 3
  const raw = Number(process.env.WEAVE_IMAGE_DAILY_LIMIT || defaultLimit)
  return Number.isSafeInteger(raw) && raw >= 1 && raw <= 100 ? raw : defaultLimit
}

export function imageModel(choice: ImageModelChoice) {
  return choice === 'fast' ? 'gpt-image-2.6-flare' : 'gpt-image-2.6-sunburst'
}

export async function ensureImageWorkshopSchema() {
  const pool = getPool()
  await pool.query(
    "CREATE TABLE IF NOT EXISTS weave_image_workshop_assets (" +
    "id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
    "prompt text NOT NULL, style varchar(32) NOT NULL, model varchar(80) NOT NULL," +
    "aspect varchar(16) NOT NULL, quality varchar(16) NOT NULL," +
    "output_format varchar(8) NOT NULL, reference_asset_id uuid," +
    "status varchar(16) NOT NULL DEFAULT 'generating'," +
    "object_name text, error_code varchar(80)," +
    "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())"
  )
  await pool.query(
    "CREATE INDEX IF NOT EXISTS weave_image_workshop_user_created_idx " +
    "ON weave_image_workshop_assets (user_id, created_at DESC)"
  )
}

export type ImageAssetRow = {
  id: string; prompt: string; style: string; model: string; aspect: string;
  quality: string; output_format: ImageFormat; status: string;
  object_name: string | null; created_at: Date | string;
}

export function imageAssetForClient(row: ImageAssetRow) {
  const url = row.object_name
    ? '/api/media/' + row.object_name.split('/').map(encodeURIComponent).join('/')
    : null
  return {
    id: row.id,
    prompt: row.prompt,
    style: row.style,
    model: row.model,
    aspect: row.aspect,
    quality: row.quality,
    format: row.output_format,
    status: row.status,
    url,
    createdAt: row.created_at,
  }
}
