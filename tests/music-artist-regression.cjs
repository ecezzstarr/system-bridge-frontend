// Run: node tests/music-artist-regression.cjs
// Exercises actual SQL using embedded PostgreSQL; multi-connection load testing
// is still required against PostgreSQL before a high-traffic rollout.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { PGlite } = require('@electric-sql/pglite')
const { NextRequest } = require('next/server')
const root = path.resolve(__dirname, '..')
const db = new PGlite()
let signedIn = null
const query = async (text, values) => {
  if (text.startsWith('-- Music Artist')) {
    const results = await db.exec(text)
    return results.at(-1) || { rows: [] }
  }
  return db.query(text, values)
}
const pool = { query, connect: async () => ({ query, release() {} }) }
const dbModule = { getPool: () => pool, sql: async (strings, ...values) => {
  const text = strings.reduce((all, part, i) => all + (i ? `$${i}` : '') + part, '')
  return (await query(text, values)).rows
} }
const cache = new Map()
function load(relative) {
  if (cache.has(relative)) return cache.get(relative)
  const module = { exports: {} }
  cache.set(relative, module.exports)
  const source = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const localRequire = name => {
    if (name === '@/lib/db') return dbModule
    if (name === '@/lib/auth-api') return { getAuthUser: async () => signedIn }
    if (name === '@/lib/weave-lifestyle') return { getLifestyleAccess: async id => {
      const user = (await query('SELECT * FROM users WHERE id=$1', [id])).rows[0]
      return { active: user.is_active && (user.is_subscription_exempt || user.subscription_status === 'active'), role: user.role }
    } }
    if (name === '@/lib/weave-event-store') return { getFlameEvent: async () => ({ effectiveStatus: 'inactive' }) }
    if (name.startsWith('@/')) return load(name.slice(2) + '.ts')
    return require(name)
  }
  vm.runInNewContext(source, { module, exports: module.exports, require: localRequire, console, Date, URL, Intl, setTimeout, clearTimeout }, { filename: relative })
  return module.exports
}

async function main() {
  const rules = load('lib/music-artist-rules.ts')
  const engine = load('lib/music-artist.ts')
  const dj = load('lib/dj-broadcast.ts')
  assert.equal(load('lib/music-artist-schema.ts').MUSIC_ARTIST_SCHEMA, fs.readFileSync(path.join(root, 'migrations/20261009_music_artist_lifestyle.sql'), 'utf8'))
  const { localArtistTime, dailyArtistSlots, canStartArtistSlot, artistUrl } = rules
  assert.equal(localArtistTime('2027-01-01T18:00', 'Africa/Lagos').toISOString(), '2027-01-01T17:00:00.000Z')
  assert.throws(() => localArtistTime('2027-02-30T18:00', 'Africa/Lagos'))
  assert.throws(() => localArtistTime('2027-03-14T02:30', 'America/New_York'), /daylight saving/)
  assert.throws(() => localArtistTime('2027-11-07T01:30', 'America/New_York'), /daylight saving/)
  const dst = dailyArtistSlots({ startLocal: '2027-03-13T18:00', timeZone: 'America/New_York', durationMinutes: 60, days: 2 }, 0)
  assert.equal(new Date(dst[1].startsAt) - new Date(dst[0].startsAt), 23 * 3600000)
  for (const input of ['http://music.com/a', 'https://localhost/a', 'https://127.0.0.1/a', 'https://[::1]/a', 'https://user:secret@music.com/a', 'javascript:alert(1)']) assert.throws(() => artistUrl(input))
  assert.equal(artistUrl('https://music.weavingsystem.online/live.mp3'), 'https://music.weavingsystem.online/live.mp3')
  const edge = { status: 'scheduled', starts_at: new Date(1000), ends_at: new Date(2000) }
  assert.equal(canStartArtistSlot(edge, 999), false)
  assert.equal(canStartArtistSlot(edge, 1000), true)
  assert.equal(canStartArtistSlot(edge, 2000), false)
  assert.throws(() => dailyArtistSlots({ startLocal: '2020-01-01T12:00', timeZone: 'Africa/Lagos', durationMinutes: 30, days: 1 }))

  await db.exec(`CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text,role text,is_active boolean DEFAULT true,
    subscription_status text DEFAULT 'active',subscription_expiry timestamptz,is_subscription_exempt boolean DEFAULT false);
    CREATE TABLE notifications (user_id uuid,type text,title text,content text,from_user_name text,link text);`)
  const makeUser = async (name, role) => (await query('INSERT INTO users (name,role) VALUES ($1,$2) RETURNING *', [name, role])).rows[0]
  const admin = await makeUser('Administration', 'admin')
  const client = await makeUser('Client Artist', 'client')
  const bridger = await makeUser('Bridger Artist', 'bridger')
  const agent = await makeUser('Agent Artist', 'agent')
  const outsider = await makeUser('Unsupported', 'visitor')
  const application = { stageName: 'New Flame', genre: 'Afrobeats', experience: 'upcoming', availability: 'Every evening after 18:00', timeZone: 'Africa/Lagos', accepted: true }
  for (const user of [client, bridger, agent]) {
    const artist = await engine.applyMusicArtist(user.id, { ...application, stageName: user.name })
    assert.equal(artist.status, 'pending')
    assert.equal((await query('SELECT role FROM users WHERE id=$1', [user.id])).rows[0].role, user.role)
  }
  await assert.rejects(engine.applyMusicArtist(outsider.id, application), error => error.status === 403)
  await assert.rejects(engine.applyMusicArtist(client.id, application), error => error.status === 409)
  await assert.rejects(engine.applyMusicArtist(client.id, { ...application, accepted: false }), /Confirm/)
  const terms = 'WEAVE pays 1000 NGN for each completed 30-minute performance, payable weekly. Initial engagement is 30 days.'
  let offer = await engine.reviewMusicArtist(admin.id, { artistId: client.id, action: 'offer', terms })
  const oldVersion = offer.offer_version
  offer = await engine.reviewMusicArtist(admin.id, { artistId: client.id, action: 'offer', terms: terms + ' Slots are agreed in advance.' })
  await assert.rejects(engine.acceptMusicArtistOffer(client.id, { accepted: true, signature: client.name, offerVersion: oldVersion }), error => error.status === 409)
  await assert.rejects(engine.acceptMusicArtistOffer(client.id, { accepted: true, signature: 'Wrong Person', offerVersion: offer.offer_version }), /full name/)
  await engine.acceptMusicArtistOffer(client.id, { accepted: true, signature: client.name, offerVersion: offer.offer_version })
  assert.equal((await engine.getMusicArtistState(client.id)).artist.status, 'active')

  const future = { artistId: client.id, title: 'Evening sound', startLocal: '2035-02-03T18:00', timeZone: 'Africa/Lagos', durationMinutes: 30, days: 1 }
  await engine.scheduleArtistPerformances(admin.id, future)
  await assert.rejects(engine.scheduleArtistPerformances(admin.id, { ...future, artistId: bridger.id }), /accept an approved/)
  const before = (await query('SELECT count(*)::int AS n FROM artist_performances')).rows[0].n
  await assert.rejects(engine.scheduleArtistPerformances(admin.id, { ...future, startLocal: '2035-02-02T18:00', days: 2 }), error => error.status === 409)
  assert.equal((await query('SELECT count(*)::int AS n FROM artist_performances')).rows[0].n, before, 'Conflicting daily booking must roll back even its free first day')
  await engine.scheduleArtistPerformances(admin.id, { ...future, startLocal: '2035-02-03T18:30' })
  const publicProgramme = await engine.getArtistProgramme('2035-02-03', 'Africa/Lagos')
  assert.equal(publicProgramme.length, 2)
  for (const key of ['stream_url', 'offer_terms', 'accepted_name', 'availability', 'artist_id']) assert.equal(key in publicProgramme[0], false)
  const futureSlot = (await engine.getMusicArtistState(client.id)).performances[0]
  await engine.updateArtistPerformance(client.id, false, { action: 'source', performanceId: futureSlot.id, streamUrl: 'https://music.weavingsystem.online/live.mp3' })
  await assert.rejects(engine.updateArtistPerformance(client.id, false, { action: 'start', performanceId: futureSlot.id }), /assigned performance time/)
  await assert.rejects(engine.updateArtistPerformance(bridger.id, false, { action: 'source', performanceId: futureSlot.id, streamUrl: 'https://music.weavingsystem.online/other.mp3' }), error => error.status === 403)
  await assert.rejects(engine.updateArtistPerformance(client.id, false, { action: 'cancel', performanceId: futureSlot.id }), error => error.status === 403)

  const liveSlot = (await query(`INSERT INTO artist_performances (artist_id,title,starts_at,ends_at,time_zone,created_by)
    VALUES ($1,'Artist concert',NOW()-INTERVAL '1 minute',NOW()+INTERVAL '30 minutes','Africa/Lagos',$2) RETURNING *`, [client.id, admin.id])).rows[0]
  await assert.rejects(engine.updateArtistPerformance(client.id, false, { action: 'start', performanceId: liveSlot.id }), /listener URL/)
  await engine.updateArtistPerformance(client.id, false, { action: 'source', performanceId: liveSlot.id, streamUrl: 'https://music.weavingsystem.online/live.mp3' })
  await query("UPDATE users SET subscription_status='suspended' WHERE id=$1", [client.id])
  await assert.rejects(engine.updateArtistPerformance(client.id, false, { action: 'start', performanceId: liveSlot.id }), error => error.status === 403)
  await query("UPDATE users SET subscription_status='active' WHERE id=$1", [client.id])
  await engine.updateArtistPerformance(client.id, false, { action: 'start', performanceId: liveSlot.id })
  const live = await dj.resolveDjBroadcastState()
  assert.equal(live.state.source_type, 'artist_live')
  assert.equal(live.state.track_artist, client.name)
  assert.equal(live.elapsedSeconds, 0, 'Live input must never be seeked to a file offset')
  await assert.rejects(engine.updateArtistPerformance(client.id, false, { action: 'source', performanceId: liveSlot.id, streamUrl: 'https://music.weavingsystem.online/replacement.mp3' }), /before going live/)

  await dj.ensureDjSchema()
  const track = (await query("INSERT INTO dj_tracks (title,file_url,duration_seconds) VALUES ('DJ programme','https://music.weavingsystem.online/background.mp3',10000) RETURNING id")).rows[0]
  await query("UPDATE dj_broadcast_state SET is_live=true,current_track_id=$1,track_started_at=NOW()-INTERVAL '1 minute' WHERE id=1", [track.id])
  await query("UPDATE artist_performances SET ends_at=NOW()-INTERVAL '1 second' WHERE id=$1", [liveSlot.id])
  const resumed = await dj.resolveDjBroadcastState()
  assert.equal(resumed.state.track_title, 'DJ programme')
  assert.ok(resumed.elapsedSeconds >= 59)
  await engine.getMusicArtistState(client.id)
  assert.equal((await query('SELECT status FROM artist_performances WHERE id=$1', [liveSlot.id])).rows[0].status, 'completed')

  const adminApi = load('app/api/admin/dj/artists/route.ts')
  const artistApi = load('app/api/music-artist/route.ts')
  const request = new NextRequest('https://weavingsystem.online/api/admin/dj/artists')
  signedIn = null
  assert.equal((await adminApi.GET(request)).status, 401)
  signedIn = client
  assert.equal((await adminApi.GET(request)).status, 403)
  signedIn = admin
  assert.equal((await adminApi.GET(request)).status, 200)
  assert.equal((await artistApi.GET(request)).status, 403)
  signedIn = client
  assert.equal((await artistApi.POST(new NextRequest('https://weavingsystem.online/api/music-artist', { method: 'POST', body: 'null' }))).status, 400)

  await engine.reviewMusicArtist(admin.id, { artistId: client.id, action: 'end', note: 'Engagement completed.' })
  assert.equal((await query("SELECT count(*)::int AS n FROM artist_performances WHERE artist_id=$1 AND status IN ('scheduled','live')", [client.id])).rows[0].n, 0)
  await engine.applyMusicArtist(client.id, application)
  const history = (await query("SELECT document FROM artist_employment_history WHERE artist_id=$1 AND event='accepted'", [client.id])).rows
  assert.equal(history.length, 1)
  assert.equal(history[0].document.accepted_name, client.name, 'Signed offers survive later reapplication')
  console.log('Music Artist regression passed: eligibility, offer signatures/versions, role preservation, SQL rollback, scheduling, time zones, ownership, API access, expiry and DJ fallback.')
}
main().then(() => db.close()).catch(async error => { console.error(error); await db.close(); process.exitCode = 1 })
