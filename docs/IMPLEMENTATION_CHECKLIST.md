# Fantasy Emoji Forge — Implementation Checklist

> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** February 2026

---

## Table of Contents

0. [Repo + Project Bootstrapping](#0-repo--project-bootstrapping)
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

## 1. Core UI Routes (Skeleton)

- [ ] `/create` page with:
  - [ ] Prompt input
  - [ ] Style selector (sticker / bold-outline)
  - [ ] Generate button + loading state
  - [ ] Error toast/alert
- [ ] `/design/[id]` page with:
  - [ ] Editor layout shell (left accessories, center canvas, right properties/export)
  - [ ] Placeholder panels + responsive layout

---

## 2. Fabric Editor Foundation (Client-Only)

- [ ] Install Fabric (`fabric`)
- [ ] Create `FabricCanvas.tsx` (client component)
  - [ ] Initialize canvas on mount
  - [ ] Dispose on unmount
  - [ ] `preserveObjectStacking = true`
  - [ ] Default canvas size (512×512) + scaling for viewport
- [ ] Add selection handling
  - [ ] On select: update store with object id/type
  - [ ] On clear: unset selected
- [ ] Add object transform controls
  - [ ] Move/scale/rotate enabled
  - [ ] Lock/unlock toggle
- [ ] Add Z-order controls
  - [ ] Bring forward/back
  - [ ] Send to front/back

> **Definition of Done:** You can add a dummy object to the canvas and edit it.

---

## 3. State Management (Editor Store)

- [ ] Add Zustand store
- [ ] Store fields:
  - [ ] Canvas reference (or accessors)
  - [ ] `selectedObjectId`
  - [ ] `layers[]` derived metadata (id, name, zIndex, locked, hidden)
- [ ] Implement "sync layers" function
  - [ ] Rebuild layer list on object add/remove/reorder
- [ ] Wire selection events to store

> **Definition of Done:** Layer panel can list canvas objects and selecting a row selects the object.

---

## 4. SVG Loading Pipeline (No AI Yet)

- [ ] Implement SVG loader utility
  - [ ] `loadSvgFromString(svg)` into Fabric
  - [ ] Group SVG elements
  - [ ] Center on canvas
  - [ ] Make base layer "lockable"
- [ ] Add "Upload SVG" dev-only button (for testing)
  - [ ] Paste SVG text area OR file upload
- [ ] Ensure Fabric load failure shows a friendly error

> **Definition of Done:** You can paste an SVG and it appears on canvas reliably.

---

## 5. Database + Prisma

- [ ] Add Prisma + Postgres connection
- [ ] Create `Design` model
  - [ ] `id`, `baseSvgUrl`, `canvasJson`, timestamps, optional `thumbnailUrl`
- [ ] Run migrations
- [ ] Add DB helper (`lib/db.ts`)
- [ ] Add basic seed script (optional)

> **Definition of Done:** You can create/read a Design record in dev.

---

## 6. Object Storage (S3 / R2)

- [ ] Choose provider: AWS S3 or Cloudflare R2
- [ ] Implement `lib/storage.ts`
  - [ ] `putObject(key, body, contentType)`
  - [ ] `getSignedUrl(key)` (if private)
  - [ ] Public bucket path strategy if public files
- [ ] Define folder conventions:

```
svgs/{id}.svg
exports/{designId}/{size}.png
thumbnails/{designId}.png
assets/{pack}/{asset}.svg
```

> **Definition of Done:** You can upload an SVG file and retrieve it by URL.

---

## 7. SVG Sanitization (Mandatory)

- [ ] Implement `lib/sanitize-svg.ts`
  - [ ] Strip `<script>`, `<foreignObject>`
  - [ ] Strip `on*` attributes
  - [ ] Block external refs (`href`, `xlink:href`) unless data-safe
  - [ ] Enforce `viewBox` and `width/height` to 512
- [ ] Add unit tests for sanitizer
  - [ ] "Bad SVG" examples
  - [ ] "Allowed SVG" examples

> **Definition of Done:** Sanitizer rejects unsafe SVG and normalizes safe SVG consistently.

---

## 8. AI Provider Integration (SVG Direct)

- [ ] Implement `lib/ai.ts` provider wrapper
  - [ ] Build prompt template for sticker SVG
  - [ ] Call provider endpoint
  - [ ] Return raw SVG string
  - [ ] Normalize error handling (timeouts, invalid response)
- [ ] Create `POST /api/generate-svg`
  - [ ] Zod validate request
  - [ ] Rate limit
  - [ ] Call AI provider
  - [ ] Sanitize SVG
  - [ ] Upload sanitized SVG to storage
  - [ ] Return `svgUrl`, `width/height`
- [ ] Add request logging (duration, prompt length, response size)

> **Definition of Done:** `/create` can generate an SVG from a prompt and load it into Fabric.

---

## 9. Design Save/Load

- [ ] Implement Fabric serialization

```javascript
canvas.toJSON([...customProps])
// Include name, layerType, assetId as custom props
```

- [ ] Create `POST /api/save-design`
  - [ ] Validate payload (`baseSvgUrl` + `canvasJson`)
  - [ ] Create DB record
  - [ ] Return `designId`
- [ ] Create `GET /api/load-design?id=...`
  - [ ] Fetch from DB
  - [ ] Return `baseSvgUrl` + `canvasJson`
- [ ] Implement `/design/[id]` loader
  - [ ] Load base SVG (if needed)
  - [ ] `canvas.loadFromJSON(canvasJson, ...)`
  - [ ] Ensure object URLs are still resolvable

> **Definition of Done:** You can generate → edit → save → refresh → continue editing.

---

## 10. Accessories System (Your SVG Pack)

- [ ] Decide asset format:
  - [ ] SVG files + JSON manifest
- [ ] Create `public/assets/manifest.json` (or DB table later)
  - [ ] `id`, `name`, `category`, `tags`, `svgUrl`, `defaultZ`
- [ ] Implement `AccessoryPanel`
  - [ ] Category tabs
  - [ ] Search/filter by tags
  - [ ] Click to add accessory to canvas
- [ ] Implement add-accessory behavior
  - [ ] Load SVG
  - [ ] Position at center or anchor
  - [ ] Set `layerType="accessory"`, `assetId`
  - [ ] Apply default z-index

> **Definition of Done:** You can add multiple fantasy accessories and edit them independently.

---

## 11. Properties Panel (Quality-of-Life)

- [ ] Selected object controls:
  - [ ] Position (x/y)
  - [ ] Scale
  - [ ] Rotation
  - [ ] Opacity
  - [ ] Flip H/V
  - [ ] Lock toggle
- [ ] Color editing (MVP version)
  - [ ] If SVG objects have fills/strokes: basic color replace
  - [ ] Palette selector (apply to selected)
- [ ] Reset transforms button

> **Definition of Done:** Users can fine-tune without fighting drag handles.

---

## 12. Export System (SVG + PNG Presets)

- [ ] Export SVG button
  - [ ] `canvas.toSVG()` download
- [ ] Export PNG buttons (128/256/512)
  - [ ] `toDataURL({ multiplier })`
  - [ ] Ensure transparent background
- [ ] Optional: upload exports to storage
  - [ ] Store `exports/` files
  - [ ] Return download URLs

> **Definition of Done:** Exports match what's shown on canvas.

---

## 13. Thumbnail Generation

- [ ] Generate thumbnail on save (client or server)
  - [ ] Client: `toDataURL({ multiplier: 0.25 })`
  - [ ] Upload to storage
  - [ ] Save `thumbnailUrl`
- [ ] Add thumbnails to "My Designs" (if you add auth later)

---

## 14. Rate Limiting + Abuse Protection

- [ ] Add rate limiting to `/api/generate-svg`
  - [ ] IP-based limits
  - [ ] Optional user-based limits (when auth exists)
- [ ] Add prompt filtering constraints
  - [ ] Length cap
  - [ ] Blocked terms list (optional)
- [ ] Add daily free generation count (feature flag / env)

> **Definition of Done:** You can't get cost-spiked by a single bad actor.

---

## 15. Error Handling & UX Polish

- [ ] "Regenerate" button (keeps prompt)
- [ ] "Undo/Redo"
  - [ ] Simple stack: save JSON snapshots on change (throttled)
- [ ] Autosave draft locally (`localStorage`) before DB save
- [ ] Empty states, better loading skeletons
- [ ] Keyboard shortcuts
  - [ ] Delete selected
  - [ ] `Ctrl/Cmd + Z` / `Shift+Z`

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
