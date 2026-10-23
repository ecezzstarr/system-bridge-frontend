# WEAVE Video Studio — original stories and production

This extends the existing Video Ad Studio. It does **not** replace the order, wallet, pricing, receipts, Administration placement, or media workflows.

## Features implemented by this change

1. Administration can create a video from **exact authored narration text**. Enter a production name, paste the manuscript in *Original Words*, and choose a duration. The full source is saved without AI rewriting in `admin_video_ad_projects.narration_script`; readable caption excerpts are formed into scene slots. A paced-speech guard prevents fitting long readings into unrealistically short videos.
2. Upload an image or clip into one scene of an original-script production. Unfilled scenes reuse that first media, so one approved Burning River cover can carry an entire episode. Other scenes can be replaced individually.
3. Record a microphone track in the browser, or upload licensed MP3, M4A, WAV, OGG or WEBM narration through the existing authenticated WEAVE storage. Original narration stays editable as text but **does not falsely appear as generated audio**.
4. Optionally generate narration with a self-hosted neural voice engine if the server has a licensed Piper-compatible local model installed and `WEAVE_PIPER_BIN` and `WEAVE_PIPER_MODEL` configured. Without a model, the button is unavailable; microphone/upload remains functional. This is not an external voice subscription.
5. FFmpeg renders readable text, original images/clips, the narration track, and optional licensed music to 720×1280 H.264/AAC MP4. Music is quieter under speech. FFprobe blocks export if the narrator's recording exceeds video duration (so words are not cut off).
6. Paid Agent, Bridger, and Client productions now have their own scene editor, narration capture, soundtrack control, safe save action, render action, player, and download link. Project edits are restricted to the paid owner. Outside-client order and receipt rules remain intact.

## Narration release procedure — Book One: Burning River

- Sign in to Administration and open **Video Ad Studio**.
- Give the production a name, paste the author's exact Prelude, and choose a duration long enough for a deliberate storyteller voice.
- Form the production, upload the approved Burning River image, and check the on-screen caption excerpts.
- Record the reading, upload a professionally read version, or use WEAVE Local Voice when configured.
- Add music only when licensed; keep it lower than speech.
- Save and render. Review the video and audio. Publish the verified MP4 through WEAVE placement or an authorized distribution channel.

**Do not paraphrase user-authored prose without explicit editorial permission.** The source of truth is `narration_script`, not `scene.text`.

## Self-hosted voice configuration

A Piper-compatible offline neural narrator requires a local executable, a voice-model file, appropriate redistribution/usage rights, and sufficient RAM/CPU. The WEAVE Docker images do not ship or silently download a model. A server Administrator must install or mount the binary and model in the runtime image, then set:

```dotenv
WEAVE_PIPER_BIN=/opt/weave/voice/bin/piper
WEAVE_PIPER_MODEL=/opt/weave/voice/models/approved_narrator.onnx
```

The executable must accept `--model <path> --output_file <wav-path>` and read UTF-8 text from standard input. The voice engine saves WAV directly to WEAVE media storage. Install models only from providers with rights suitable for WEAVE productions and customer uses.

Without both settings, WEAVE does not claim that voice generation exists. It offers recording/upload instead. Use a persistent `WEAVE_MEDIA_ROOT` volume for your MP4, image and audio assets; ephemeral server filesystems will not retain media across redeploys.

## Distinctions and further production work

- Available: exact-script story formation, manual scene editing, real voice recording/upload, optional locally hosted speech generation, audio mixing, source-preserving caption scenes, own-video export.
- Existing: service-door orders, paid production, receipts, Administration placements.
- **Not yet delivered by this change:** automated speech-to-text alignment, voice cloning/consent management, full multitrack frame-accurate editing, AI video generation, AI music composition, multi-format export presets, and direct TikTok API publishing from the new editor. Do not show these as working controls until implemented and tested.
- Production video generation and local speech are compute-intensive. Render jobs currently run on the application runtime; a durable worker queue is recommended before high-volume usage.

Run the regression check:

```bash
node tests/weave-narration-studio.cjs
```
