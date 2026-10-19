import { getPool } from '@/lib/db'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'

export const GUIDANCE_DEPARTMENTS = [
  { key: 'mandate', label: 'Mandate', function: 'Carry authorized company action, guidance, and escalation.' },
  { key: 'forensic', label: 'Forensics', function: 'Help examine records, evidence and movement; send unresolved matters to Administration.' },
  { key: 'lawyer', label: 'Attorney', function: 'Clarify internal procedures, agreements and questions; refer regulated legal matters to qualified professionals.' },
] as const
export type GuidanceDepartment = typeof GUIDANCE_DEPARTMENTS[number]['key']

export function isGuidanceDepartment(value:unknown):value is GuidanceDepartment {
  return typeof value==='string' && GUIDANCE_DEPARTMENTS.some(dept=>dept.key===value)
}
export const GUIDANCE_DEPARTMENT_NAMES:Record<GuidanceDepartment,string> = {
  mandate:'Mandate', forensic:'Forensics', lawyer:'Attorney',
}
export const GUIDANCE_NOTE_MIN=25
export const GUIDANCE_NOTE_MAX=1500

let schemaPromise:Promise<void>|null=null
export async function ensureGuidanceDepartmentSchema() {
  if(!schemaPromise) {
    schemaPromise=getPool().query(`
      CREATE TABLE IF NOT EXISTS lounge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type varchar(20) NOT NULL DEFAULT 'public',
  room_id text NOT NULL DEFAULT 'main',
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_avatar text,
  sender_role varchar(40) NOT NULL,
  content text NOT NULL DEFAULT '',
  message_type text NOT NULL DEFAULT 'text',
  media_url text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS lounge_messages_room_type_idx
 ON lounge_messages(room_type,room_id,message_type,created_at);

      CREATE TABLE IF NOT EXISTS weave_guidance_staff_applications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_role varchar(16) NOT NULL CHECK (source_role IN ('agent','bridger')),
        department varchar(24) NOT NULL CHECK (department IN ('mandate','forensic','lawyer')),
        application_note varchar(1500) NOT NULL,
        status varchar(16) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','approved','rejected','revoked')),
        reviewer_id uuid REFERENCES users(id),
        review_note varchar(2000),
        reviewed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE(user_id,department)
      );
      CREATE INDEX IF NOT EXISTS weave_guidance_staff_queue_idx
        ON weave_guidance_staff_applications(status,created_at DESC);
      CREATE INDEX IF NOT EXISTS weave_guidance_staff_active_idx
        ON weave_guidance_staff_applications(user_id,department)
        WHERE status='approved';
    `).then(()=>{}).catch(error=>{schemaPromise=null;throw error})
  }
  await schemaPromise
}

// No application or job title ever grants its own access; only an approved,
// unrevoked record and an active underlying Lifestyle position can reply.
export async function getGuidanceStaffDepartments(user:{id:string;role:string}) {
  if(!['agent','bridger'].includes(user.role))return [] as GuidanceDepartment[]
  const access=await getLifestyleAccess(user.id)
  if(!access.active || access.role!==user.role)return [] as GuidanceDepartment[]
  await ensureGuidanceDepartmentSchema()
  const {rows}=await getPool().query(`
    SELECT department FROM weave_guidance_staff_applications
    WHERE user_id=$1::uuid AND status='approved' AND source_role=$2
  `,[user.id,user.role])
  return rows.map(row=>row.department).filter(isGuidanceDepartment)
}

export async function canReplyForGuidanceDepartment(user:{id:string;role:string},department:unknown) {
  if(!isGuidanceDepartment(department))return false
  const allowed=await getGuidanceStaffDepartments(user)
  return allowed.includes(department)
}
