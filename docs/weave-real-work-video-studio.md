# WEAVE Video Ad Studio · Real Work Filming and Earnings Simulations

## Production contract
The new **Real Work Video Maker** extends—not replaces—WEAVE Video Ad Studio at `/video-ad-studio` and `/admin/video-ad-workshop`. It reuses existing paid production orders, wallet fees, customer ownership checks, upload endpoints, narration, media storage, FFmpeg and vertical MP4 render delivery. No external generation API or fabricated photo/video is part of this mode.

The maker supports three role-specific working narratives:
- **Agent · Agility distribution**: select Agility cartons; follow stock order, Administrations payment verification, confirmed receipt, customer/outlet distribution, completed recorded sales. The example uses the same source constants as the Agent's live catalog: ₦30,000 stock per carton, 10 packages, ₦4,000 customer sale per package, and ₦10,000 **possible gross margin on a full carton sell-out** before delivery/other expenses. Unsold stock generates no realized earnings.
- **Bridger · Hope outreach**: prospect discovery, private consent-based video conversation, demonstration of working systems, independently quoted paid video/creative service, production, verified customer payment and delivery. The example customer quote is **not company salary, a verified sale, or profit**. Internal Studio charges are System Switch, not NGN.
- **Client · Dream Lovely**: File Folder business build, Customer Door, enquiry, example order, fulfillment, recorded gross sale. A customer quote is not a verified receipt and sales are not net profit.

## How a user makes the film
1. Enter the existing Video Ad Studio as an Agent, Bridger or Client. Open or pay for an ordinary production; **no new free render path exists**. Administrations can create its own company production within its existing workshop.
2. Inside the editor choose a working-position template, stock/carton or customer-quote example, and Real Texture look. The template fills the existing scene count/duration; any already-owned uploaded footage stays attached.
3. Follow each **film this shot** brief. Capture real working footage on the phone camera, use licensed photographs or screen recordings of genuinely available WEAVE screens. Get participant and customer consent. Do not show private customer names, contact details, account balances or payment evidence without permission. Do not replace missing proof with a made-up successful transaction.
4. Record narration through the existing Narration Capture, or upload a professionally narrated licensed audio track. Text voiceover directions are a reading guide **not a generated voice**.
5. Save, render and review the vertical H.264/AAC MP4. The FFmpeg pipeline normalizes real footage, applies a selectable natural/documentary/cinematic light grade, subtle texture/grain, real-image optical movement for photographs, captions, and a top **SIMULATION - NOT ACTUAL EARNINGS** band for demo-mode projects.

## Truthfulness / safety
Simulation mode is persisted as `admin_video_ad_projects.demo_mode` and cannot be unset by ordinary project updates after enabling. The server renderer, not a removable UI text caption, applies the earning-disclosure watermark. This prevents a sample Agent's ₦10,000 gross margin or a sample Client quote from being presented as a bank-verified receipt. Never present modelled earnings as guaranteed compensation. The watermark is not intended as proof that filmed actors are real customers.

## Technical / release
- Pure film scripts: `lib/weave-work-demo-video.ts`
- FFmpeg real texture filters: `lib/weave-video-real-texture.ts`
- Participant and Administrations editor controls, with smartphone camera capture and real footage upload.
- Schema auto-migration via `ensureVideoAdWorkshopSchema`, immutable demonstration flag through both update APIs.
- Server render retains original media ownership validation and paid Studio authorization.
- Regression: `node tests/weave-real-work-video.cjs`, added to Production Check.
- Host FFmpeg/font/media volume remains necessary. The production Docker runtime must provide `ffmpeg`, `ffprobe`, `/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf`, and durable `WEAVE_MEDIA_ROOT`.

**Out of scope:** camera footage or speech generated from text, impersonated customers, invented receipts, guaranteed earnings, AI texture synthesis, automatic narration, automated TikTok uploads, and production-ready quality claims without actual Android/iPhone and real-footage tests.
