/** Permanent individual premium Hope effects. Prices are validated server-side. */
export type HopeVideoEffectKind='color'|'remove'|'scene'|'face'
export type HopeVideoFilter={
 id:string;name:string;detail:string;priceSystemSwitch:number;
 effectKind:HopeVideoEffectKind;css:string;sceneSrc?:string;
 faceStyle?:'cyber'|'gold'|'anonymous'
}
export const HOPE_VIDEO_FILTERS:readonly HopeVideoFilter[]=[
  {
    "id": "radiance-warm",
    "name": "Radiance Warm",
    "detail": "Soft golden light and warmer skin tones.",
    "priceSystemSwitch": 2,
    "effectKind": "color",
    "css": "brightness(1.08) contrast(1.04) saturate(1.22) sepia(0.11)"
  },
  {
    "id": "studio-light",
    "name": "Studio Light",
    "detail": "Bright, crisp look for business conversations.",
    "priceSystemSwitch": 2,
    "effectKind": "color",
    "css": "brightness(1.16) contrast(1.09) saturate(1.07)"
  },
  {
    "id": "cinema-noir",
    "name": "Cinema Noir",
    "detail": "Classic black-and-white contrast.",
    "priceSystemSwitch": 2,
    "effectKind": "color",
    "css": "grayscale(1) contrast(1.33) brightness(1.05)"
  },
  {
    "id": "ocean-cool",
    "name": "Ocean Cool",
    "detail": "Clean cool-blue tint for your video.",
    "priceSystemSwitch": 3,
    "effectKind": "color",
    "css": "brightness(1.05) contrast(1.08) saturate(1.25) hue-rotate(14deg)"
  },
  {
    "id": "dream-violet",
    "name": "Dream Violet",
    "detail": "A rich violet-toned cinematic finish.",
    "priceSystemSwitch": 3,
    "effectKind": "color",
    "css": "brightness(1.08) contrast(1.05) saturate(1.36) hue-rotate(35deg)"
  },
  {
    "id": "soft-portrait",
    "name": "Soft Portrait",
    "detail": "A gentle overall soft-focus image.",
    "priceSystemSwitch": 3,
    "effectKind": "color",
    "css": "blur(0.55px) brightness(1.1) contrast(0.95) saturate(1.12)"
  },
  {
    "id": "background-hide",
    "name": "Background Hide",
    "detail": "Remove surroundings and replace them with a neutral studio color.",
    "priceSystemSwitch": 15,
    "effectKind": "remove",
    "css": "none"
  },
  {
    "id": "scene-executive-suite",
    "name": "Executive Suite",
    "detail": "Modern executive office",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/executive-suite.svg"
  },
  {
    "id": "scene-white-citadel",
    "name": "White Citadel",
    "detail": "Plus File Folder-inspired white marble",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/white-citadel.svg"
  },
  {
    "id": "scene-golden-hall",
    "name": "Golden Hall",
    "detail": "Warm premium company hall",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/golden-hall.svg"
  },
  {
    "id": "scene-creative-studio",
    "name": "Creative Studio",
    "detail": "Art and production studio",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/creative-studio.svg"
  },
  {
    "id": "scene-library-of-time",
    "name": "Library of Time",
    "detail": "Quiet shelves and reading room",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/library-of-time.svg"
  },
  {
    "id": "scene-city-rooftop",
    "name": "City Rooftop",
    "detail": "Elevated skyline outlook",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/city-rooftop.svg"
  },
  {
    "id": "scene-sunset-ocean",
    "name": "Ocean Horizon",
    "detail": "Sunset over open water",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/sunset-ocean.svg"
  },
  {
    "id": "scene-forest-pavilion",
    "name": "Forest Pavilion",
    "detail": "Lush green retreat",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/forest-pavilion.svg"
  },
  {
    "id": "scene-mountain-view",
    "name": "Mountain View",
    "detail": "A scenic mountain landscape",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/mountain-view.svg"
  },
  {
    "id": "scene-neon-lab",
    "name": "Neon Lab",
    "detail": "Modern creative technology",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/neon-lab.svg"
  },
  {
    "id": "scene-sky-garden",
    "name": "Sky Garden",
    "detail": "Green modern terrace",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/sky-garden.svg"
  },
  {
    "id": "scene-art-gallery",
    "name": "Art Gallery",
    "detail": "Sculptural exhibition hall",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/art-gallery.svg"
  },
  {
    "id": "scene-warm-lounge",
    "name": "Warm Lounge",
    "detail": "Private business living room",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/warm-lounge.svg"
  },
  {
    "id": "scene-moonlit-world",
    "name": "Moonlit World",
    "detail": "Night skyline and stars",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/moonlit-world.svg"
  },
  {
    "id": "scene-ivory-workshop",
    "name": "Ivory Workshop",
    "detail": "Minimal white design workspace",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/video-backgrounds/ivory-workshop.svg"
  },
  {
    "id": "scene-burning-river",
    "name": "Burning River",
    "detail": "The official Flame Event world.",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/flame-event/burning-river-open-world-official.webp"
  },
  {
    "id": "scene-bridge-of-radiance",
    "name": "Bridge of Radiance",
    "detail": "The official crossing landscape.",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/flame-event/burning-river-crossing-official.webp"
  },
  {
    "id": "scene-plus-world",
    "name": "Plus File Folder",
    "detail": "Weave's premium private world aesthetic.",
    "priceSystemSwitch": 12,
    "effectKind": "scene",
    "css": "none",
    "sceneSrc": "/weave/plus-file-folder-white-official.webp"
  },
  {
    "id": "face-cyber-mask",
    "name": "Cyber Visage",
    "detail": "Live face-tracked synthetic digital mask; does not copy an actual person's identity.",
    "priceSystemSwitch": 20,
    "effectKind": "face",
    "css": "none",
    "faceStyle": "cyber"
  },
  {
    "id": "face-gold-mask",
    "name": "Golden Visage",
    "detail": "Face-tracked gold theatrical character mask, not realistic identity swapping.",
    "priceSystemSwitch": 20,
    "effectKind": "face",
    "css": "none",
    "faceStyle": "gold"
  },
  {
    "id": "face-anonymous",
    "name": "Anonymous Visage",
    "detail": "Face-tracked opaque stylized privacy mask; no real-person impersonation.",
    "priceSystemSwitch": 25,
    "effectKind": "face",
    "css": "none",
    "faceStyle": "anonymous"
  }
]
export type HopeVideoFilterId=string

export function findHopeVideoFilter(value:unknown):HopeVideoFilter|undefined {
 return HOPE_VIDEO_FILTERS.find(filter=>filter.id===value)
}
