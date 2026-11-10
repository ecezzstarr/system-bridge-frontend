import {getPool} from '@/lib/db'

export const IMAGE_WORKSHOP_ROLES = new Set(['admin','agent','bridger','client','legion'])
export const IMAGE_PRESETS = {
  photographic: 'Photorealistic professional photography, credible physical detail, natural materials, carefully composed light.',
  product: 'Premium commercial product photography, clear hero subject, polished realistic textures, professional studio lighting.',
  architecture: 'Architectural visualization, coherent buildable structures, detailed materials, purposeful perspective and surrounding environment.',
  cinematic: 'Cinematic key art with expressive staging, rich atmosphere, deliberate color grading and dramatic depth.',
  portrait: 'Professional editorial portrait, expressive but natural likeness, thoughtful wardrobe, lighting and background.',
  fashion: 'Fashion campaign editorial, striking composition, accurate fabric textures, refined luxury styling.',
  poster: 'Art-directed print poster, intentional hierarchy and precise legible typography only when requested.',
  illustration: 'Highly detailed original illustration, consistent characters, deliberate strokes and sophisticated color.',
  fantasy: 'Immersive fantasy worldbuilding, rich environmental details, believable light, strong visual storytelling.',
  threed: 'High-end 3D rendered concept art, dimensional geometry, premium surface materials and realistic lighting.',
  social: 'Clear modern social advertisement, focused offer, excellent hierarchy, room for branding and readable text.',
  storybook: 'Beautiful illustrated storybook page, elegant composition, textured painterly detail, cohesive narrative setting.',
} as const

export type ImagePreset = keyof typeof IMAGE_PRESETS
export const IMAGE_SIZES = ['1024x1024','1024x1536','1536x1024'] as const
export type ImageSize = typeof IMAGE_SIZES[number]
export const IMAGE_MODELS = ['gpt-image-2.5-flare','gpt-image-2.5-sunburst'] as const
export type ImageModel = typeof IMAGE_MODELS[number]

export function imageWorkshopConfigured() {
  // Separate opt-in protects the company's image-provider budget.
  return process.env.WEAVE_IMAGE_WORKSHOP_ENABLED === 'true' && Boolean(process.env.OPENAI_API_KEY)
}

export function imageWorkshopDailyLimit() {
  const configured=Number(process.env.WEAVE_IMAGE_WORKSHOP_DAILY_LIMIT||8)
  return Number.isFinite(configured)?Math.max(1,Math.min(30,Math.floor(configured))):8
}

let schemaPromise:Promise<void>|null=null
export async function ensureImageWorkshopSchema(){
  if(!schemaPromise){
    schemaPromise=(async()=>{
      const pool=getPool()
      await pool.query(`CREATE TABLE IF NOT EXISTS weave_image_workshop_jobs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt text NOT NULL,
        preset varchar(30) NOT NULL,
        model varchar(64) NOT NULL,
        image_size varchar(32) NOT NULL,
        image_count integer NOT NULL CHECK(image_count BETWEEN 1 AND 2),
        status varchar(16) NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed')),
        error_message text,
        created_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS weave_image_jobs_user_day_idx
        ON weave_image_workshop_jobs(user_id,created_at DESC)`)
      await pool.query(`CREATE TABLE IF NOT EXISTS weave_image_workshop_assets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id uuid NOT NULL REFERENCES weave_image_workshop_jobs(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        object_name text NOT NULL,
        prompt text NOT NULL,
        preset varchar(30) NOT NULL,
        image_size varchar(32) NOT NULL,
        model varchar(64) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`)
      await pool.query(`CREATE INDEX IF NOT EXISTS weave_image_assets_user_idx
        ON weave_image_workshop_assets(user_id,created_at DESC)`)
    })().catch(error=>{schemaPromise=null;throw error})
  }
  await schemaPromise
}

export async function imageWorkshopTodayUsed(userId:string){
  const row=(await getPool().query(`SELECT COALESCE(SUM(image_count),0)::int AS used
    FROM weave_image_workshop_jobs
    WHERE user_id=$1::uuid AND created_at>=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
      AND status IN ('running','completed')`,[userId])).rows[0]
  return Number(row?.used||0)
}

export type WorkshopAsset={
  id:string;prompt:string;preset:string;image_size:string;model:string;created_at:string
}

export async function imageWorkshopAssets(userId:string){
  return (await getPool().query<WorkshopAsset>(`SELECT id,prompt,preset,image_size,model,created_at
    FROM weave_image_workshop_assets WHERE user_id=$1::uuid
    ORDER BY created_at DESC LIMIT 36`,[userId])).rows
}
