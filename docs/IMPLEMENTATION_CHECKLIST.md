# Fantasy Emoji Forge — Implementation Checklist

> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** February 2026

---

## Table of Contents

0. [Repo + Project Bootstrapping](#0-repo--project-bootstrapping)
0b. [Auth (Auth.js)](#0b-auth-authjs)
1. [Core UI Routes (Skeleton)](#1-core-ui-routes-skeleton)
2. [Fabric Editor Foundation](#2-fabric-editor-foundation-client-only)
3. [State Management (Editor Store)](#3-state-management-editor-store)
4. [SVG Loading Pipeline](#4-svg-loading-pipeline-no-ai-yet)
5. [Database + Prisma](#5-database--prisma)
6. [Object Storage (S3 / R2)](#6-object-storage-s3--r2)
7. [SVG Sanitization](#7-svg-sanitization-mandatory)
8. [AI Provider Integration](#8-ai-provider-integration-svg-direct)
9. [Design Save/Load](#9-design-saveload)
10. [Accessories System](#10-accessories-system-your-svg-pack)
11. [Properties Panel](#11-properties-panel-quality-of-life)
12. [Export System](#12-export-system-svg--png-presets)
13. [Thumbnail Generation](#13-thumbnail-generation)
14. [Rate Limiting + Abuse Protection](#14-rate-limiting--abuse-protection)
15. [Error Handling & UX Polish](#15-error-handling--ux-polish)
16. [Testing Checklist](#16-testing-checklist)
17. [Deployment Checklist](#17-deployment-checklist)
18. [Launch-Ready Acceptance Criteria](#18-launch-ready-acceptance-criteria)

---

## 0. Repo + Project Bootstrapping

- [ ] Create Next.js project (App Router + TS)
- [ ] Add Tailwind + shadcn/ui
- [ ] Set up linting/formatting
  - [ ] ESLint
  - [ ] Prettier
- [ ] Add env management
  - [ ] `.env.example`
  - [ ] `NEXT_PUBLIC_APP_URL`
  - [ ] `DATABASE_URL`
  - [ ] `S3_*` or `R2_*` creds
  - [ ] `AI_PROVIDER_API_KEY`
- [ ] Add `README.md` with local run steps

---

## 0b. Auth (Auth.js)

- [x] Install Auth.js + Prisma adapter; add Auth.js models to Prisma and run migration
- [x] Configure auth (`auth.ts`), API route `api/auth/[...nextauth]`, SessionProvider in layout
- [x] Sign-in / sign-up pages and header (sign in, sign out)
- [x] Tie designs to user: set `Design.userId` from session in save-design API

**Detailed checklist:** [docs/AUTH_CHECKLIST.md](docs/AUTH_CHECKLIST.md)  
**Plan & architecture:** [docs/AUTH_PLAN.md](docs/AUTH_PLAN.md)

---

## 1. Core UI Routes (Skeleton)

- [x] `/create` page with:
  - [x] Prompt input
  - [x] Style selector (sticker / bold-outline)
  - [x] Generate button + loading state
  - [x] Error toast/alert
- [x] `/design/[id]` page with:
  - [x] Editor layout shell (left accessories, center canvas, right properties/export)
  - [x] Placeholder panels + responsive layout

---

## 2. Fabric Editor Foundation (Client-Only)

- [x] Install Fabric (`fabric`)
- [x] Create `FabricCanvas.tsx` (client component)
  - [x] Initialize canvas on mount
  - [x] Dispose on unmount (`destroy()`)
  - [x] `preserveObjectStacking = true`
  - [x] Default canvas size (512×512) + scaling for viewport (container max-width)
- [x] Add selection handling
  - [x] On select: `onSelectionChange(objectId, objectType)` callback (store in §3)
  - [x] On clear: unset selected
- [x] Add object transform controls
  - [x] Move/scale/rotate enabled (Fabric default)
  - [x] Lock/unlock toggle (toolbar + `setLockSelected`)
- [x] Add Z-order controls
  - [x] Bring forward/back (`bringObjectForward`, `sendObjectBackwards`)
  - [x] Send to front/back (`bringObjectToFront`, `sendObjectToBack`)

> **Definition of Done:** You can add a dummy object to the canvas and edit it.

### Next steps (Section 2 plan)

1. **FabricCanvas.tsx** – Client component: ref to container, `useEffect` create `new Canvas(el, { width: 512, height: 512, preserveObjectStacking: true })`, `destroy()` on unmount; optional viewport scaling via `setDimensions`/CSS.
2. **Selection** – Subscribe to `selection:created` / `selection:cleared` (and `selection:updated`); callbacks or Zustand store (store in §3) with selected object id/type.
3. **Transforms** – Fabric provides move/scale/rotate by default; add lock/unlock via object `lockMovementX/Y`, `lockRotation`, `lockScalingX/Y` (exposed later via Properties panel).
4. **Z-order** – Use canvas `bringObjectToFront`, `sendObjectToBack`, `bringObjectForward`, `sendObjectBackwards`; expose via toolbar or Properties panel.
5. **DoD** – Add one dummy object (e.g. `Rect`) on first load; replace design page canvas placeholder with `<FabricCanvas />`.

---

## 3. State Management (Editor Store)

- [x] Add Zustand store
- [x] Store fields:
  - [x] Canvas reference (or accessors)
  - [x] `selectedObjectId`
  - [x] `layers[]` derived metadata (id, name, zIndex, locked, hidden)
- [x] Implement "sync layers" function
  - [x] Rebuild layer list on object add/remove/reorder
- [x] Wire selection events to store

> **Definition of Done:** Layer panel can list canvas objects and selecting a row selects the object.

---

## 4. SVG Loading Pipeline (No AI Yet)

- [x] Implement SVG loader utility
  - [x] `loadSvgFromString(svg)` into Fabric
  - [x] Group SVG elements
  - [x] Center on canvas
  - [x] Make base layer "lockable"
- [x] Add "Upload SVG" dev-only button (for testing)
  - [x] Paste SVG text area OR file upload
- [x] Ensure Fabric load failure shows a friendly error

> **Definition of Done:** You can paste an SVG and it appears on canvas reliably.

---

## 5. Database + Prisma

- [x] Add Prisma + Postgres connection
- [x] Create `Design` model
  - [x] `id`, `baseSvgUrl`, `canvasJson`, timestamps, optional `thumbnailUrl`
- [x] Run migrations
- [x] Add DB helper (`lib/db.ts`)
- [x] Add basic seed script (optional)

> **Definition of Done:** You can create/read a Design record in dev.

---

## 6. Object Storage (S3 / R2)

- [x] Choose provider: AWS S3 or Cloudflare R2
- [x] Implement `lib/storage.ts`
  - [x] `putObject(key, body, contentType)`
  - [x] `getSignedUrl(key)` (if private)
  - [x] Public bucket path strategy if public files
- [x] Define folder conventions:

```filepath
svgs/{id}.svg
exports/{designId}/{size}.png
thumbnails/{designId}.png
assets/{pack}/{asset}.svg
```

> **Definition of Done:** You can upload an SVG file and retrieve it by URL.

---

## 7. SVG Sanitization (Mandatory)

- [x] Implement `lib/sanitize-svg.ts`
  - [x] Strip `<script>`, `<foreignObject>`
  - [x] Strip `on*` attributes
  - [x] Block external refs (`href`, `xlink:href`) unless data-safe
  - [x] Enforce `viewBox` and `width/height` to 512
- [x] Add unit tests for sanitizer
  - [x] "Bad SVG" examples
  - [x] "Allowed SVG" examples

> **Definition of Done:** Sanitizer rejects unsafe SVG and normalizes safe SVG consistently.

---

## 8. AI Provider Integration (SVG Direct)

- [x] Implement `lib/ai.ts` provider wrapper
  - [x] Build prompt template for sticker SVG
  - [x] Call provider endpoint
  - [x] Return raw SVG string
  - [x] Normalize error handling (timeouts, invalid response)
- [x] Create `POST /api/generate-svg`
  - [x] Zod validate request
  - [x] Rate limit
  - [x] Call AI provider
  - [x] Sanitize SVG
  - [x] Upload sanitized SVG to storage
  - [x] Return `svgUrl`, `width/height`
- [x] Add request logging (duration, prompt length, response size)

> **Definition of Done:** `/create` can generate an SVG from a prompt and load it into Fabric.

---

## 9. Design Save/Load

- [x] Implement Fabric serialization

```javascript
canvas.toJSON([...customProps])
// Include name, layerType, assetId as custom props
```

- [x] Create `POST /api/save-design`
  - [x] Validate payload (`baseSvgUrl` + `canvasJson`)
  - [x] Create DB record
  - [x] Return `designId`
- [x] Create `GET /api/load-design?id=...`
  - [x] Fetch from DB
  - [x] Return `baseSvgUrl` + `canvasJson`
- [x] Implement `/design/[id]` loader
  - [x] Load base SVG (if needed)
  - [x] `canvas.loadFromJSON(canvasJson, ...)`
  - [x] Ensure object URLs are still resolvable

> **Definition of Done:** You can generate → edit → save → refresh → continue editing.

---

## 10. Accessories System (Your SVG Pack)

- [x] Decide asset format:
  - [x] SVG files + JSON manifest
- [x] Create `public/assets/manifest.json` (or DB table later)
  - [x] `id`, `name`, `category`, `tags`, `svgUrl`, `defaultZ`
- [x] Implement `AccessoryPanel`
  - [x] Category tabs
  - [x] Search/filter by tags
  - [x] Click to add accessory to canvas
- [x] Implement add-accessory behavior
  - [x] Load SVG
  - [x] Position at center or anchor
  - [x] Set `layerType="accessory"`, `assetId`
  - [x] Apply default z-index

> **Definition of Done:** You can add multiple fantasy accessories and edit them independently.

---

## 11. Properties Panel (Quality-of-Life)

- [x] Selected object controls:
  - [x] Position (x/y)
  - [x] Scale
  - [x] Rotation
  - [x] Opacity
  - [x] Flip H/V
  - [x] Lock toggle
- [x] Color editing (MVP version)
  - [x] If SVG objects have fills/strokes: basic color replace
  - [x] Palette selector (apply to selected)
- [x] Reset transforms button

> **Definition of Done:** Users can fine-tune without fighting drag handles.

---

## 12. Export System (SVG + PNG Presets)

- [x] Export SVG button
  - [x] `canvas.toSVG()` download
- [x] Export PNG buttons (128/256/512)
  - [x] `toDataURL({ multiplier })`
  - [x] Ensure transparent background
- [x] Optional: upload exports to storage
  - [x] Store `exports/` files
  - [x] Return download URLs

> **Definition of Done:** Exports match what's shown on canvas.

---

## 13. Thumbnail Generation

- [x] Generate thumbnail on save (client or server)
  - [x] Client: `toDataURL({ multiplier: 0.25 })`
  - [x] Upload to storage
  - [x] Save `thumbnailUrl`
- [ ] Add thumbnails to "My Designs" (if you add auth later)

---

## 14. Rate Limiting + Abuse Protection

- [x] Add rate limiting to `/api/generate-svg`
  - [x] IP-based limits
  - [x] Optional user-based limits (when auth exists)
- [x] Add prompt filtering constraints
  - [x] Length cap
  - [x] Blocked terms list (optional)
- [x] Add daily free generation count (feature flag / env)

> **Definition of Done:** You can't get cost-spiked by a single bad actor.

---

## 15. Error Handling & UX Polish

- [x] "Regenerate" button (keeps prompt)
- [x] "Undo/Redo"
  - [x] Simple stack: save JSON snapshots on change (throttled)
- [x] Autosave draft locally (`localStorage`) before DB save
- [x] Empty states, better loading skeletons
- [x] Keyboard shortcuts
  - [x] Delete selected
  - [x] `Ctrl/Cmd + Z` / `Shift+Z`

---

## 16. Testing Checklist

### Unit Tests

- [ ] Zod schemas
- [ ] SVG sanitizer
- [ ] Storage helper (mocked)

### Integration Tests

- [ ] Generate SVG endpoint success + failure
- [ ] Save/load endpoints

### Manual QA Script

- [ ] Generate 10 emojis; ensure load success rate
- [ ] Add 10 accessories; ensure perf ok
- [ ] Export all sizes; verify transparency
- [ ] Save/load; verify fidelity

---

## 17. Deployment Checklist

- [ ] Configure env vars in hosting (Vercel/Firebase/etc.)
- [ ] Ensure storage CORS allows reading SVG/PNGs
- [ ] Confirm Prisma migrations run in CI/CD
- [ ] Set up logging (Axiom or similar)
- [ ] Add cost monitoring for AI calls
- [ ] Add health endpoint (optional)

---

## 18. Launch-Ready Acceptance Criteria

- [ ] Create screen generates an SVG reliably
- [ ] SVG loads into Fabric with sane scaling and centered composition
- [ ] User can add/edit accessories
- [ ] Save + reload works
- [ ] Export SVG + PNG (128/256/512) works
- [ ] Rate limiting prevents abuse
- [ ] Sanitizer blocks unsafe SVG content
