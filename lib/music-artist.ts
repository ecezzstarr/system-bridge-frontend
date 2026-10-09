import type { PoolClient } from 'pg'
import { getPool } from '@/lib/db'
import { MUSIC_ARTIST_SCHEMA } from '@/lib/music-artist-schema'
import { getLifestyleAccess } from '@/lib/weave-lifestyle'
import { ArtistError, artistId, artistText, artistTimeZone, artistUrl, dailyArtistSlots } from '@/lib/music-artist-rules'

let schemaReady: Promise<void> | null = null
export function ensureMusicArtistSchema() {
  if (!schemaReady) schemaReady = getPool().query(MUSIC_ARTIST_SCHEMA).then(() => undefined).catch(error => {
    schemaReady = null
    throw error
  })
  return schemaReady
}

// Every schedule mutation shares this lock, including batch creation, artist
// start/stop and Administration cancellation. A failed batch rolls back in full.
async function artistTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  await ensureMusicArtistSchema()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_artist_schedule'))")
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally { client.release() }
}

async function eligibleArtistUser(client: PoolClient, userId: string) {
  const result = await client.query(`SELECT id,name,role,is_active,subscription_status,subscription_expiry,is_subscription_exempt
    FROM users WHERE id=$1::uuid FOR SHARE`, [userId])
  const user = result.rows[0]
  if (!user || !['agent', 'bridger', 'client'].includes(user.role) || user.is_active === false) {
    throw new ArtistError('Music Artist is available to active Agent, Bridger and Client accounts.', 403)
  }
  if (!user.is_subscription_exempt && (user.subscription_status !== 'active' ||
      (user.subscription_expiry && new Date(user.subscription_expiry).getTime() <= Date.now()))) {
    throw new ArtistError('Renew your account monthly subscription to enter Music Artist Lifestyle.', 403)
  }
  return user
}

async function recordArtistDocument(client: PoolClient, actorId: string, event: string, artist: Record<string, unknown>) {
  await client.query(`INSERT INTO artist_employment_history (artist_id,actor_id,event,document)
    VALUES ($1::uuid,$2::uuid,$3,$4::jsonb)`, [artist.user_id, actorId, event, JSON.stringify(artist)])
}

async function notifyArtist(userId: string | null, title: string, content: string) {
  try {
    await getPool().query(`INSERT INTO notifications (user_id,type,title,content,from_user_name,link)
      SELECT id,'music_artist',$2,$3,'WEAVE DJ Workshop',$4 FROM users
      WHERE ($1::uuid IS NOT NULL AND id=$1::uuid) OR ($1::uuid IS NULL AND role='admin' AND is_active=true)`,
    [userId, title, content, userId ? '/weave/lifestyles/music-artist' : '/admin/dj-workshop'])
  } catch (error) { console.error('[music-artist] notification failed', error) }
}

async function expirePerformances(client: Pick<PoolClient, 'query'> = getPool()) {
  await client.query(`UPDATE artist_performances SET
      status=CASE WHEN status='live' THEN 'completed' ELSE 'missed' END,
      ended_at=CASE WHEN status='live' THEN LEAST(NOW(),ends_at) ELSE ended_at END
    WHERE status IN ('scheduled','live') AND ends_at<=NOW()`)
  // Suspension, expired subscription or ended employment must also release the DJ.
  await client.query(`UPDATE artist_performances p SET status='cancelled',ended_at=NOW()
    WHERE p.status='live' AND NOT EXISTS (
      SELECT 1 FROM music_artists a JOIN users u ON u.id=a.user_id
      WHERE a.user_id=p.artist_id AND a.status='active' AND u.is_active=true
        AND u.role IN ('agent','bridger','client')
        AND (u.is_subscription_exempt=true OR (u.subscription_status='active' AND (u.subscription_expiry IS NULL OR u.subscription_expiry>NOW())))
    )`)
}

export async function applyMusicArtist(userId: string, body: Record<string, unknown>) {
  const stageName = artistText(body.stageName, 'Stage name', 2, 80)
  const genre = artistText(body.genre, 'Music style', 2, 120)
  const availability = artistText(body.availability, 'Availability', 5, 1000)
  const introduction = artistText(body.introduction || '', 'Introduction', 0, 2000)
  const timeZone = artistTimeZone(body.timeZone)
  const sampleUrl = body.sampleUrl ? artistUrl(body.sampleUrl, 'Music sample link') : null
  if (!['upcoming', 'established'].includes(String(body.experience))) throw new ArtistError('Choose upcoming or established artist.')
  if (body.accepted !== true) throw new ArtistError('Confirm that you are applying to perform live on WEAVE.')
  // Initialize the shared subscription fields through the existing access model.
  await getLifestyleAccess(userId)
  const artist = await artistTransaction(async client => {
    const user = await eligibleArtistUser(client, userId)
    const { rows } = await client.query(`INSERT INTO music_artists
      (user_id,source_role,stage_name,experience,genre,sample_url,availability,time_zone,introduction)
      VALUES ($1::uuid,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (user_id) DO UPDATE SET source_role=EXCLUDED.source_role,stage_name=EXCLUDED.stage_name,
        experience=EXCLUDED.experience,genre=EXCLUDED.genre,sample_url=EXCLUDED.sample_url,
        availability=EXCLUDED.availability,time_zone=EXCLUDED.time_zone,introduction=EXCLUDED.introduction,
        status='pending',offer_terms=NULL,offer_version=NULL,review_note=NULL,reviewed_by=NULL,reviewed_at=NULL,
        accepted_name=NULL,accepted_at=NULL,updated_at=NOW()
      WHERE music_artists.status IN ('rejected','ended') RETURNING *`,
    [userId, user.role, stageName, body.experience, genre, sampleUrl, availability, timeZone, introduction])
    if (!rows[0]) throw new ArtistError('Your artist application or employment is already open.', 409)
    await recordArtistDocument(client, userId, 'applied', rows[0])
    return rows[0]
  })
  await notifyArtist(null, 'Music Artist application', `${stageName} has applied for daily live performances. Review the application in DJ Workshop.`)
  return artist
}

export async function reviewMusicArtist(adminId: string, body: Record<string, unknown>) {
  const userId = artistId(body.artistId)
  const action = body.action
  if (!['offer', 'reject', 'end'].includes(String(action))) throw new ArtistError('Choose offer, reject or end employment.')
  const terms = action === 'offer' ? artistText(body.terms, 'Employment and payment terms', 20, 5000) : null
  const note = artistText(body.note || '', 'Review note', action === 'offer' ? 0 : 5, 2000)
  const artist = await artistTransaction(async client => {
    const { rows } = await client.query('SELECT * FROM music_artists WHERE user_id=$1::uuid FOR UPDATE', [userId])
    const current = rows[0]
    if (!current) throw new ArtistError('Artist application not found.', 404)
    if (action === 'end' ? current.status !== 'active' : !['pending', 'offered'].includes(current.status)) {
      throw new ArtistError('The application has changed. Refresh before reviewing it.', 409)
    }
    const status = action === 'offer' ? 'offered' : action === 'reject' ? 'rejected' : 'ended'
    const result = await client.query(`UPDATE music_artists SET status=$2::varchar,
      offer_terms=CASE WHEN $2::varchar='offered' THEN $3 ELSE offer_terms END,
      offer_version=CASE WHEN $2::varchar='offered' THEN gen_random_uuid() ELSE offer_version END,
      review_note=$4,reviewed_by=$5::uuid,reviewed_at=NOW(),updated_at=NOW()
      WHERE user_id=$1::uuid RETURNING *`, [userId, status, terms, note || null, adminId])
    if (action === 'end') await client.query(`UPDATE artist_performances SET status='cancelled',ended_at=NOW()
      WHERE artist_id=$1::uuid AND status IN ('scheduled','live')`, [userId])
    await recordArtistDocument(client, adminId, String(action), result.rows[0])
    return result.rows[0]
  })
  await notifyArtist(userId, action === 'offer' ? 'Your Music Artist offer is ready' : `Music Artist ${artist.status}`,
    action === 'offer' ? 'Read and accept your employment and payment terms in Music Artist Lifestyle before performances are scheduled.' : note)
  return artist
}

export async function acceptMusicArtistOffer(userId: string, body: Record<string, unknown>) {
  const version = artistId(body.offerVersion)
  const signature = artistText(body.signature, 'Full name', 1, 160)
  if (body.accepted !== true) throw new ArtistError('Read and accept the employment offer explicitly.')
  const artist = await artistTransaction(async client => {
    const user = await eligibleArtistUser(client, userId)
    if (signature.toLocaleLowerCase() !== String(user.name || '').trim().toLocaleLowerCase()) throw new ArtistError('Sign using the full name on your WEAVE account.')
    const result = await client.query(`UPDATE music_artists SET status='active',accepted_name=$3,accepted_at=NOW(),updated_at=NOW()
      WHERE user_id=$1::uuid AND status='offered' AND offer_version=$2::uuid RETURNING *`, [userId, version, signature])
    if (!result.rows[0]) throw new ArtistError('This offer has changed or was already accepted. Refresh to read the current offer.', 409)
    await recordArtistDocument(client, userId, 'accepted', result.rows[0])
    return result.rows[0]
  })
  await notifyArtist(null, 'Music Artist offer accepted', `${artist.stage_name} accepted the offer. Daily performance slots can now be scheduled.`)
  return artist
}

export async function scheduleArtistPerformances(adminId: string, body: Record<string, unknown>) {
  const artistIdValue = artistId(body.artistId)
  const title = artistText(body.title, 'Performance title', 2, 120)
  const slots = dailyArtistSlots({ startLocal: body.startLocal, timeZone: body.timeZone, durationMinutes: body.durationMinutes, days: body.days })
  const performances = await artistTransaction(async client => {
    await expirePerformances(client)
    const { rows } = await client.query("SELECT * FROM music_artists WHERE user_id=$1::uuid AND status='active' FOR UPDATE", [artistIdValue])
    if (!rows[0]) throw new ArtistError('The artist must accept an approved employment offer before scheduling.', 409)
    await eligibleArtistUser(client, artistIdValue)
    const created = []
    for (const slot of slots) {
      const clash = await client.query(`SELECT p.title,a.stage_name,p.starts_at FROM artist_performances p
        JOIN music_artists a ON a.user_id=p.artist_id
        WHERE p.status IN ('scheduled','live') AND p.starts_at<$2::timestamptz AND p.ends_at>$1::timestamptz LIMIT 1`, [slot.startsAt, slot.endsAt])
      if (clash.rows[0]) throw new ArtistError(`The DJ is already booked for ${clash.rows[0].stage_name} at ${new Date(clash.rows[0].starts_at).toISOString()}. Choose another time.`, 409)
      const result = await client.query(`INSERT INTO artist_performances (artist_id,title,starts_at,ends_at,time_zone,created_by)
        VALUES ($1::uuid,$2,$3,$4,$5,$6::uuid) RETURNING *`, [artistIdValue, title, slot.startsAt, slot.endsAt, slot.timeZone, adminId])
      created.push(result.rows[0])
    }
    return created
  })
  await notifyArtist(artistIdValue, 'Your live performances are scheduled', `${performances.length} performance(s): ${title}. Check your timetable and connect your live audio listener URL before your slot.`)
  return performances
}

export async function updateArtistPerformance(userId: string, isAdmin: boolean, body: Record<string, unknown>) {
  const id = artistId(body.performanceId)
  const action = body.action
  if (!['source', 'start', 'stop', 'cancel'].includes(String(action))) throw new ArtistError('Unknown performance action.')
  if (action === 'cancel' && !isAdmin) throw new ArtistError('Administration manages the performance timetable.', 403)
  const source = action === 'source' ? artistUrl(body.streamUrl) : null
  const performance = await artistTransaction(async client => {
    await expirePerformances(client)
    const { rows } = await client.query(`SELECT p.*,a.stage_name,a.status AS artist_status,
      (p.starts_at<=NOW() AND NOW()<p.ends_at) AS in_slot
      FROM artist_performances p JOIN music_artists a ON a.user_id=p.artist_id WHERE p.id=$1::uuid FOR UPDATE OF p`, [id])
    const slot = rows[0]
    if (!slot) throw new ArtistError('Performance not found.', 404)
    if (!isAdmin && slot.artist_id !== userId) throw new ArtistError('This performance belongs to another artist.', 403)
    if (action === 'source' || action === 'start') {
      if (slot.artist_status !== 'active') throw new ArtistError('Active Music Artist employment is required.', 403)
      await eligibleArtistUser(client, slot.artist_id)
    }
    if (action === 'source') {
      if (slot.status !== 'scheduled') throw new ArtistError('Audio sources can only be set before going live.', 409)
      await client.query('UPDATE artist_performances SET stream_url=$2 WHERE id=$1::uuid', [id, source])
    } else if (action === 'start') {
      if (slot.status !== 'scheduled' || !slot.in_slot) throw new ArtistError('You can go live only during your assigned performance time.', 409)
      if (!slot.stream_url) throw new ArtistError('Connect a direct HTTPS live audio listener URL first.')
      const live = await client.query("SELECT id FROM artist_performances WHERE status='live'")
      if (live.rows.length) throw new ArtistError('Another artist is live. Administration must end that performance first.', 409)
      await client.query("UPDATE artist_performances SET status='live',started_at=NOW() WHERE id=$1::uuid", [id])
    } else if (action === 'stop') {
      if (slot.status !== 'live') throw new ArtistError('This performance is no longer live.', 409)
      await client.query("UPDATE artist_performances SET status='completed',ended_at=NOW() WHERE id=$1::uuid", [id])
    } else {
      if (!['scheduled', 'live'].includes(slot.status)) throw new ArtistError('Only scheduled or live performances can be cancelled.', 409)
      await client.query("UPDATE artist_performances SET status='cancelled',ended_at=NOW() WHERE id=$1::uuid", [id])
    }
    return { id, artistId: slot.artist_id, title: slot.title }
  })
  if (action === 'cancel') await notifyArtist(performance.artistId, 'Performance cancelled', `${performance.title} was cancelled by Administration. Check your timetable.`)
  return performance
}

export async function stopLiveArtistPerformance() {
  return artistTransaction(async client => {
    await client.query("UPDATE artist_performances SET status='completed',ended_at=NOW() WHERE status='live'")
  })
}

export async function getLiveArtistPerformance() {
  await ensureMusicArtistSchema()
  // Listener polling is read-only. Time/eligibility predicates release playback
  // immediately; artist/Admin reads and mutations persist the terminal status.
  const { rows } = await getPool().query(`SELECT p.*,a.stage_name FROM artist_performances p
    JOIN music_artists a ON a.user_id=p.artist_id JOIN users u ON u.id=a.user_id
    WHERE p.status='live' AND p.starts_at<=NOW() AND p.ends_at>NOW() AND a.status='active'
      AND u.is_active=true AND u.role IN ('agent','bridger','client')
      AND (u.is_subscription_exempt=true OR (u.subscription_status='active' AND (u.subscription_expiry IS NULL OR u.subscription_expiry>NOW())))
    LIMIT 1`)
  return rows[0] || null
}

export async function getMusicArtistState(userId: string) {
  const access = await getLifestyleAccess(userId)
  await ensureMusicArtistSchema()
  await expirePerformances()
  const pool = getPool()
  const [artists, performances] = await Promise.all([
    pool.query('SELECT * FROM music_artists WHERE user_id=$1::uuid', [userId]),
    pool.query(`SELECT p.*,a.stage_name FROM artist_performances p JOIN music_artists a ON a.user_id=p.artist_id
      WHERE p.artist_id=$1::uuid AND p.ends_at>NOW()-INTERVAL '7 days' ORDER BY p.starts_at LIMIT 200`, [userId]),
  ])
  return { access, artist: artists.rows[0] || null, performances: performances.rows }
}

export async function getAdminArtistState() {
  await ensureMusicArtistSchema()
  await expirePerformances()
  const pool = getPool()
  const [artists, performances] = await Promise.all([
    pool.query(`SELECT a.*,u.name FROM music_artists a JOIN users u ON u.id=a.user_id
      ORDER BY CASE a.status WHEN 'pending' THEN 0 WHEN 'offered' THEN 1 WHEN 'active' THEN 2 ELSE 3 END,a.updated_at DESC LIMIT 300`),
    pool.query(`SELECT p.*,a.stage_name FROM artist_performances p JOIN music_artists a ON a.user_id=p.artist_id
      WHERE p.ends_at>NOW()-INTERVAL '1 day' ORDER BY p.starts_at LIMIT 1000`),
  ])
  return { artists: artists.rows, performances: performances.rows }
}

export async function getArtistProgramme(date: string, timeZone: string) {
  const zone = artistTimeZone(timeZone)
  const start = dailyArtistSlots({ startLocal: `${date}T00:00`, timeZone: zone, days: 1, durationMinutes: 1 }, 0)[0].startsAt
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const end = dailyArtistSlots({ startLocal: `${next.toISOString().slice(0, 10)}T00:00`, timeZone: zone, days: 1, durationMinutes: 1 }, 0)[0].startsAt
  await ensureMusicArtistSchema()
  // Public timetable deliberately excludes offers, signatures, account names,
  // availability and stream URLs. Only the current live URL goes to the DJ player.
  const { rows } = await getPool().query(`SELECT p.id,p.title,p.starts_at,p.ends_at,p.time_zone,
    CASE WHEN p.ends_at<=NOW() AND p.status='live' THEN 'completed'
      WHEN p.ends_at<=NOW() AND p.status='scheduled' THEN 'missed' ELSE p.status END AS status,a.stage_name
    FROM artist_performances p JOIN music_artists a ON a.user_id=p.artist_id
    WHERE p.starts_at<$2::timestamptz AND p.ends_at>$1::timestamptz AND p.status<>'cancelled'
    ORDER BY p.starts_at LIMIT 300`, [start, end])
  return rows
}
