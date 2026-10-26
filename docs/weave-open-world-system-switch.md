# Permanent WEAVE Open World · System Switch

## Institutional naming and boundaries
- **The Weave of Presence: System Switch — Bridge of Radiance** is the permanent threshold and container.
- **WEAVE Open World** is the shared physical land inside System Switch where verified File Folder territories, live system previews, Client construction and public Customer Doors appear.
- **Burning River** is Company Loop 1's Flame Event. Flowing fire and water are part of its activity inside the shared land, not the name of the permanent world. Later company events occupy that same place, preserving Client File Folder ownership and locations.

## One Open World · WEAVE AI File Folder ownership model
- There is exactly **one Open World** inside System Switch. WEAVE-owned File Folders and human-owned File Folders are all present in this same continuous world; do not create a separate Plus world, tier world, product world, or second Open World.
- **WEAVE File Folder** is WEAVE's AI-powered File Folder product. WEAVE builds and maintains its product experience and makes File Folder ownership available to humans. A human-owned File Folder is an owned account and private AI-enabled working environment inside the same shared world.
- **Standard, Pro, Plus, and Premium** are File Folder types/offerings, not separate worlds. Each type may define its own capabilities, construction style, materials, and operating tools, while retaining the same world, entry model, and ownership boundaries.
- The shared world must represent WEAVE's own File Folder as a genuine, textured 3D structure alongside customer territories. Do not invent a fake completed system: use the real system interface/build asset when available and label incomplete systems as forming.
- A File Folder is the territory/container; its websites, markets, services, applications, and other systems are structures belonging to that folder—not separate WEAVE businesses or separate worlds.
- Private systems and construction remain private to the owner and authorized legions. Only genuine previews explicitly published through a public Customer Door may be rendered to other visitors. Public visibility never grants private access.
- Product catalogue and purchase/access flows must select a File Folder type within the same world. Buying a type must not redirect the customer into a different world or imply that tier names are separate environments.

## Canonical entry
`/system-switch` → **System Switch Gate** for signed-in Agent, Bridger and Administration → `/system-switch/world?via=system-switch` → Client File Folder land. Visitors enter `/system-switch/world` through the official event image or public Customer Market. Clients continue entering private systems through their own client gate and may inspect public land separately.

The official Burning River event image's **Customer Door hotspot** goes straight to the same System Switch WEAVE Open World; it no longer mounts a second little 3D Client preview inside the event page. The event and permanent land are separate environments.

Retired `/system-switch/customer-doors` and `/system-switch/customer-doors/[slug]` are server redirects to the canonical world. Old `/flame-event/world` also redirects to the same permanent land, maintaining allowed `carrier`, `door`, `legion`, and crossing parameters.

## Physical scene and public access
- The world uses actual Three.js terrain texture, physically modeled trees, footpaths to verified positions, construction-scaled 3D File Folder structures, tier-sensitive material facades, windows, real system previews, and public Customer Door entrances. WEAVE's own File Folder and human-owned File Folders occupy this same land.
- The approved Burning River image is an **architectural reference**, not a substitute wallpaper behind an ordinary 2D page.
- Only real commissioned public Client Customer Doors have opening links. Buildings forming in public do not grant or imply another Client's private File Folder access.
- Company Loop 1's live river uses time-animated water/fire shader material inside the world.
- The Open World contains File Folders—including WEAVE's own AI File Folder and human-owned File Folders—and the genuine system/build previews belonging to those folders. There is no WEAVE Food Store building, food-store panel, or food-order shortcut in this world.
- Preview systems and active builds are parts of their owning Client File Folder. They appear as live, selectable world structures so customers can see the intended system style and construction taking shape in the open field before entering the commissioned public Customer Door. Preview visibility never grants access to a private File Folder.
- Client business interactions, reciprocal invitations and joint system formation remain behind the existing server permissions and verified Client ownership.

## Event separation
The world heading is **Weave Open World**, with a secondary event label that only describes Burning River as currently taking place when the Company Loop service reports it active. No forced war-gaming, avatar/joystick controls or separate empty Customer Door Plaza.

## Flame Event · Company Loop 1 department-world entrances
Loop 1 is a shared company event, but each signed-in participant receives **only their own department-world entrance** on the event ground:
- **Agent → Agent World** (`/agent/dashboard`) — Stability districts and active Agent functions.
- **Bridger → Bridger World** (`/bridger/dashboard`) — Hope districts, prospect movement and Bridge AI.
- **Administration → Administration World** (`/admin/dashboard`) — the company's supervisory, operational and organization districts.
- **Client → Client World** (`/client/dashboard`) — Dream Lovely, File Folder and enterprise participation.

The main event page `/event` receives the verified Agent/Bridger/Admin role from the session. Client Loop 1 arrival is `/client/event`, with a separate authenticated Client guard. The compact event environment renders one large **My Department World** entrance from that role, alongside *only* that role's existing work shortcuts, the official Burning River image and System Switch crossing. The latter is **not** renamed to a department world and still leads to the independent File Folder land.

Direct access to other departments' dashboard-world pages is blocked by route-role rendering guards. Existing private Client world access and system APIs preserve their own authorization independently. Regression checks: `tests/flame-event-department-world-entrances.cjs` and `tests/flame-event-role-login-flow.cjs`.

## Client-owned castle placement and two-sided Customer Door
- Every purchased Client File Folder retains its unique, permanent world slot and owner; an optional persisted `map_x/map_z` relocates only the appearance of its **castle on the shared land**. The system does not change File Numbers, accounts, payment records, workshops, store ownership or Client Customer Door privileges.
- An authenticated Client chooses **Position my castle**, taps actual open land, previews the new site and chooses **Confirm castle position**. Cancellation never writes. The server independently validates active Client ownership, same-origin requests, map boundaries, river and clear distance from every other Client castle (including those not on the current displayed map page).
- Castle moves serialize with a PostgreSQL advisory transaction lock; no two concurrent confirmations can claim overlapping spots. The new position persists through reload and is delivered by the existing public world feed; old purchased slots stay unchanged.
- When a Client taps **their own castle**, the system opens their authenticated private File Folder (`/client/system-switch`). This owner route is selected using the Client-only server-authenticated domain ID, not a guessed browser role or a public file number. The private folder continues enforcing its existing access controls.
- When a visitor, customer, Bridger, Agent, or a different Client taps a commissioned castle, it leads only to that Client's actual **public Customer Door**, directly to their enabled product/service windows. An uncommissioned castle never opens an unrelated Client's private environment.
- The public Customer Door lists the verified Client's active, sales-enabled **Legion team representatives** and offers attributable public sales links; the products are the real enabled `client_store_items` belonging to that Client. Legion attribution is carried through System Switch if provided, and checkout keeps independent authorization and receipts. No fake employee stock or extra entitlements.
- Material improvements reuse the existing physically shaded city texture atlas for cobbled paths and built castle façades. The land has physically lit grass with terrain relief, modeled woods and a flowing water/fire event element; **not a 2D sales image wallpaper**.

## Quality checks
`tests/weave-open-world-system-switch.cjs` validates permanent ownership, redirect safety, real landscape geometry, active construction, real Agent food links, public Customer Door gating and event identity. This runs alongside the existing live-world multiplayer, food, role login and System Switch CI checks.

## Still to verify on an actual deployed phone
1. Real admin/agent/bridger crossing → System Switch Gate → WEAVE Open World; direct visitor and Agent Carrier entrances.
2. Live Client domain construction, tier-specific textures, published/closed Customer Doors and actual checkout without circular redirects.
3. Phone/WebGL performance with the ground texture and real food photographs; landmarks remain tappable.
4. Compare world screenshots against the approved open-world land image. This pass is an implementation, **not certified exact visual parity** with the artwork.
5. Validate Company Loop 2 transition later. The shared world must persist across event changes.

**Release status:** Code-only. This branch documents and pins the one-world ownership model; it does not by itself implement the WEAVE-owned 3D File Folder structure or its product purchase flow. No merge or deployment.
