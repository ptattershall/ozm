# Fantasy Emoji Forge — Product Requirements Document

> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** February 2026

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Target Users](#3-target-users)
4. [High-Level User Flow](#4-high-level-user-flow)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Technical Architecture](#7-technical-architecture)
8. [UI Requirements](#8-ui-requirements)
9. [Design Constraints](#9-design-constraints)
10. [Risks](#10-risks)
11. [MVP Milestones](#11-mvp-milestones)
12. [Future Expansion Ideas](#12-future-expansion-ideas)

---

## 1. Product Overview

### Product Name

Fantasy Emoji Forge *(working name)*

### Vision

A web-based sticker-style fantasy emoji creator where:

- Users describe a concept (e.g., "Goblin wizard with glowing eyes")
- AI generates a clean, editable SVG base
- The SVG loads into a Fabric.js editor
- Users modify, layer, recolor, and enhance
- Export as SVG / PNG (multiple sizes)

### Future Expansion

- Asset packs (Dragon Pack, Necromancer Pack, etc.)
- Marketplace
- User accounts + saved designs
- Premium AI generation tiers

---

## 2. Goals & Non-Goals

### Goals (MVP)

- AI-generated SVG base image
- Fabric.js editing experience
- Add-on accessory system (your SVG pack)
- Export to SVG and PNG
- Save & reload design state

### Non-Goals (Phase 1)

- Real-time collaboration
- Mobile-native app
- 3D rendering
- Animation (Lottie/GIF)
- Marketplace

---

## 3. Target Users

**Creators making:**

- Discord emojis
- Twitch stickers
- Reaction graphics

**User Personas:**

- Fantasy fans
- Streamers
- RPG players
- Social media content creators

---

## 4. High-Level User Flow

### Flow 1 — Create New Emoji

1. User enters prompt
2. Clicks "Generate"
3. System:
   - Calls AI provider (SVG output)
   - Sanitizes SVG
   - Stores SVG
4. Fabric loads SVG into canvas
5. User edits
6. User exports or saves

### Flow 2 — Edit Existing Emoji

1. User opens saved design
2. App:
   - Loads design JSON
   - Loads base SVG
   - Rehydrates Fabric canvas
3. User edits and re-exports

---

## 5. Functional Requirements

### 5.1 AI SVG Generation

**Endpoint:** `POST /api/generate-svg`

**Input:**

```json
{
  "prompt": "string",
  "style": "sticker" | "flat" | "bold-outline",
  "colorPalette": ["string"]
}
```

**Process:**

1. Validate input with Zod
2. Call SVG AI provider
3. Receive SVG string
4. Sanitize SVG
5. Store SVG in object storage
6. Return signed URL + metadata

**Output:**

```json
{
  "svgUrl": "string",
  "width": "number",
  "height": "number"
}
```

### 5.2 SVG Sanitization

**Requirements:**

| Action | Items |
|--------|-------|
| **Remove** | `<script>`, `<foreignObject>`, External URLs |
| **Enforce** | 512x512 viewBox, Transparent background |
| **Optional** | Remove complex filters, Flatten nested groups |

> **Security Requirement:** SVG must be safe to render in browser.

### 5.3 Fabric Editor

**Core Requirements:**

- Load SVG via `loadSVGFromString` or `loadSVGFromURL`
- Group as base layer
- Preserve stacking order

**Editing Capabilities:**

| Feature | Description |
|---------|-------------|
| Move | Drag objects on canvas |
| Scale | Resize objects |
| Rotate | Rotate objects |
| Opacity | Adjust transparency |
| Layer reorder | Change z-index |
| Lock layer | Prevent edits |
| Delete layer | Remove from canvas |
| Duplicate layer | Copy object |

**Accessory System:**

Users can add:

- Horns
- Aura effects
- Weapons
- Hats
- FX layers

Each accessory:

- Comes from your SVG pack
- Has predefined anchor suggestions
- Has default z-index

### 5.4 Export System

**Formats:**

| Format | Size |
|--------|------|
| SVG | Vector |
| PNG | 128px |
| PNG | 256px |
| PNG | 512px |

**Implementation (Client-side):**

```javascript
canvas.toSVG()
canvas.toDataURL({ multiplier })
```

> **Future:** Server-side SVG → PNG for consistent output.

### 5.5 Save System

**Database Model:**

```typescript
interface Design {
  id: string
  userId?: string
  baseSvgUrl: string
  canvasJson: string  // Fabric serialized state
  createdAt: Date
  updatedAt: Date
}
```

**Stored Data:**

- Fabric JSON state
- Base SVG reference

---

## 6. Non-Functional Requirements

### Performance

- Canvas load under 1 second
- SVG complexity capped
- Max layer count (e.g., 15)

### Security

- SVG sanitization mandatory
- Rate limit AI endpoint
- Auth for saved designs (optional MVP)

### Scalability

- Use object storage (S3/R2)
- Avoid storing raw SVG in DB
- Use CDN for asset packs

---

## 7. Technical Architecture

### 7.1 Frontend

- Next.js 15 (App Router)
- TypeScript
- Fabric.js
- Tailwind CSS
- shadcn/ui

**Key Components:**

```
/app
  /create
  /design/[id]
  /api/generate-svg
  /api/save-design

/components
  FabricCanvas.tsx
  LayerPanel.tsx
  AccessoryPanel.tsx
  ExportPanel.tsx
```

### 7.2 Backend

- API Routes in Next.js
- Zod validation
- AI SVG provider
- Object storage (S3/R2)

### 7.3 Storage

**Object Storage:**

- Generated SVGs
- Accessory SVG pack
- Exported PNGs

**Database:**

- Postgres (Prisma)
- Stores design metadata only

---

## 8. UI Requirements

### Create Screen

- Prompt input
- Style selector
- Generate button
- Loading state
- Error state

### Editor Layout

```
┌─────────────┬─────────────────────┬─────────────┐
│   LEFT      │       CENTER        │    RIGHT    │
│  SIDEBAR    │                     │   SIDEBAR   │
├─────────────┼─────────────────────┼─────────────┤
│ Accessories │                     │ Properties  │
│ Layers      │       Canvas        │ Export      │
└─────────────┴─────────────────────┴─────────────┘
```

---

## 9. Design Constraints

> **Important:** These constraints are critical for managing SVG complexity.

AI prompt must enforce:

| Constraint | Reason |
|------------|--------|
| Flat vector style | Reduces path complexity |
| Bold outline | Clear boundaries |
| Limited palette | Simpler fill definitions |
| No photorealism | Keeps vectors clean |
| No gradients | Avoids rendering issues |
| No background | Transparent output |
| Centered composition | Consistent framing |

---

## 10. Risks

### Risk 1 — AI outputs messy SVG

**Mitigation:**

- Prompt engineering
- Sanitization
- Reject overly complex output

### Risk 2 — Fabric struggles with complex paths

**Mitigation:**

- Limit node count
- Flatten filters

### Risk 3 — High AI costs

**Mitigation:**

- Rate limit
- Offer free credits
- Add paid tier later

---

## 11. MVP Milestones

| Phase | Deliverables |
|-------|--------------|
| **Phase 1** | AI → SVG, Load in Fabric, Export, No login |
| **Phase 2** | Save system, Auth, Asset packs |
| **Phase 3** | Marketplace, Premium AI models, Animation |

---

## 12. Future Expansion Ideas

- "Randomize fantasy creature" button
- Themed packs (Fire Mage, Shadow Assassin)
- Auto-palette harmonizer
- Batch export
- Discord/Twitch export presets
- AI "remix" feature
- Prompt version history
