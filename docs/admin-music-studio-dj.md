# Administration Music Studio → Institutional DJ Broadcast

Status: **Draft PR #242, not merged or deployed.**

## Administration workflow

1. Open **Administration → DJ Workshop → Open the Administration Music Studio** (route `/admin/music-studio`).
2. Create one or more original musical compositions using the exact WEAVE Music Studio sound editor. Each composition supports musical tempo, 2+ audible synchronized layers, Self/Environment responses, microphone recording, sound import, musical note/level/stereo/beat controls, and timed word cues.
3. Save each composition to the **WEAVE Administration Sound Library**. Admin recordings are not borrowed from a Client File Folder, and are not publicly streamable.
4. Under **Song Assembly**, add sections: Opening, Self, Environment, Conversation, Bridge, Closing (or rename any section). Each section refers to one saved composition and repeats 1–4 times; up to 16 sections and up to **160 seconds** total. Choose different compositions for different musical movements.
5. **Render and listen** produces a real 44.1-kHz stereo 16-bit WAV using Web Audio `OfflineAudioContext`, with all song movements on one continuous audio clock, section-edge fades, and gentle dynamics compression before export. Download WAV if needed.
6. **Publish to DJ Library** prompts for Administration approval, re-renders the current arrangement, uploads its WAV to a strictly admin-only endpoint, validates a genuine RIFF/WAVE PCM file, matching recorded song duration and referenced saved compositions, then adds the song to the existing `dj_tracks` table plus a release audit record.
7. Return to the normal **DJ Workshop**, select the newly published song in the track library, add it to a playlist, and choose **Go Live**. The existing floating institutional DJ player can stream it to connected Weave positions, staying synchronized to the current broadcast timestamp.
8. Creating, previewing, saving or publishing a composition alone **never** begins a public broadcast.

## Security

- All Administration music routes explicitly enforce `getAuthUser` and role `admin` on the server, including the sound download/read endpoint.
- Client File Folder Music Studios remain Client-owned and construction-gated; this Admin studio is a distinct institutional production space, not an unintended shortcut to a Client's private sound files.
- Recorded Administration stems live in `weave-private/admin-music/`, which the generic `/api/media/` gateway refuses to serve. Max 16 MB per imported clip, 100 clips/512 MB for Admin source audio.
- Only the released **final mixed WAV master** is copied into `dj/music/weave-studio/` for intentional public broadcasting.
- The release is linked to `dj_tracks` and saved section identifiers in `weave_admin_music_releases`.
- The server rejects WAV masters whose format or duration does not match the saved arrangement. Current DJ WAV size cap is 30 MB; song duration cap is 160 seconds.
- The DJ track publication and its release/audit record are written in one database transaction.
- Do not use commercial recordings, music, or voices without broadcast authorization.

## Limitations

This is a genuine browser-based multitrack composition and song assembly workflow, not yet a professional mastering DAW. Word cues do not synthesize sung vocals: a recorded voice is needed. There is no AI text-to-singing, stem separation, key/pitch correction, beat-matching without pitch shift, VST mixing, multiband mastering, MP3/streaming AAC encoding, automatic royalty management, or automatic broadcast licensing. It does not guarantee broadcast autoplay when browsers prohibit sound without a user's gesture.

## Validation

Automated: `node tests/admin-music-studio-dj.cjs`, `node tests/music-workshop.cjs`, `npx tsc --noEmit`, `npm run build`, `docker build`.

Manual: test on Android; record voice; assemble a song with at least two distinct saved compositions; preview with speakers; publish; confirm DJ Library track appears without broadcasting; add to a playlist and start live DJ; test mid-song join synchronization and no unwanted access from Agent, Bridger, Client, Legion or unlogged sessions; verify private Admin/Client sound URL cannot be played without the intended session.

No production deployment is performed in this branch.
