# Ozmoji - Technical Design Doc

> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** February 2026

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Folder Architecture](#3-folder-architecture)
4. [Data Models](#4-data-models)
5. [API Design](#5-api-design)
6. [AI Integration Design](#6-ai-integration-design)
7. [SVG Sanitization](#7-svg-sanitization)
8. [Storage Design](#8-storage-design)
9. [Fabric Editor Design](#9-fabric-editor-design)
10. [Accessory System](#10-accessory-system)
11. [Export System](#11-export-system)
12. [Performance Controls](#12-performance-controls)
13. [Security Considerations](#13-security-considerations)
14. [Error Handling Strategy](#14-error-handling-strategy)
15. [Logging & Monitoring](#15-logging--monitoring)
16. [Future Scalability](#16-future-scalability)
17. [MVP Development Order](#17-mvp-development-order)
18. [Dev Environment Setup](#18-dev-environment-setup)

---

## 1. System Architecture Overview

### 1.1 High-Level Flow

```
User → Prompt → API → AI SVG Provider
                           ↓
                      SVG Sanitizer
                           ↓
                     Object Storage
                           ↓
                  Fabric Editor (Client)
                           ↓
                     Export (SVG/PNG)
                           ↓
                      Save Design
```

---

## 2. Tech Stack

### 2.1 Frontend

- Next.js 15 (App Router)
- TypeScript
- Fabric.js
- Tailwind CSS
- shadcn/ui
- Zustand (editor state)
- React Hook Form (prompt input)

### 2.2 Backend

- Next.js Route Handlers
- Zod validation
- Prisma ORM
- Postgres (Neon / Supabase / RDS)
- S3-compatible storage (AWS S3 / Cloudflare R2)

### 2.3 AI Layer

- AI SVG Provider (Recraft or similar)
- Rate limiting (middleware)

---

## 3. Folder Architecture

```
/app
  /create
    page.tsx
  /design/[id]
    page.tsx
  /api
    /generate-svg
      route.ts
    /save-design
      route.ts
    /load-design
      route.ts

/components
  editor/
    FabricCanvas.tsx
    LayerPanel.tsx
    AccessoryPanel.tsx
    PropertiesPanel.tsx
    ExportPanel.tsx

/lib
  ai.ts
  sanitize-svg.ts
  storage.ts
  canvas-utils.ts
  zod-schemas.ts

/store
  editor-store.ts

/prisma
  schema.prisma
```

---

## 4. Data Models

### 4.1 Prisma Schema

```prisma
model Design {
  id           String   @id @default(cuid())
  userId       String?
  baseSvgUrl   String
  canvasJson   String
  thumbnailUrl String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 4.2 Asset Model (Future)

```prisma
model Asset {
  id         String   @id @default(cuid())
  category   String
  svgUrl     String
  zIndex     Int
  tags       String[]
}
```

---

## 5. API Design

### 5.1 POST `/api/generate-svg`

**Purpose:** Generate base SVG via AI.

**Request:**

```json
{
  "prompt": "string",
  "style": "sticker" | "bold-outline"
}
```

**Validation (Zod):**

```typescript
z.object({
  prompt: z.string().min(5).max(200),
  style: z.enum(["sticker", "bold-outline"]).optional()
})
```

**Flow:**

1. Validate input
2. Build AI prompt template
3. Call AI SVG provider
4. Receive SVG string
5. Sanitize SVG
6. Upload SVG to storage
7. Return URL

**Response:**

```json
{
  "svgUrl": "string",
  "width": 512,
  "height": 512
}
```

### 5.2 POST `/api/save-design`

**Request:**

```json
{
  "baseSvgUrl": "string",
  "canvasJson": "string"
}
```

**Flow:**

1. Validate input
2. Create thumbnail from canvas (optional)
3. Store in DB

**Response:**

```json
{
  "designId": "string"
}
```

### 5.3 GET `/api/load-design?id=xxx`

**Response:**

```json
{
  "baseSvgUrl": "string",
  "canvasJson": "string"
}
```

---

## 6. AI Integration Design

### 6.1 Prompt Template

All prompts must enforce:

- Flat vector
- Bold outline
- Limited color palette
- No gradients
- No background
- Centered composition
- Clean SVG

**Example template:**

```
Create a flat sticker-style fantasy emoji illustration.
Bold black outline.
Limited color palette.
No gradients.
Transparent background.
Centered subject.
Output clean SVG vector.
Subject: {{userPrompt}}
```

### 6.2 AI Provider Wrapper (`lib/ai.ts`)

**Responsibilities:**

- Build structured prompt
- Call provider
- Handle errors
- Return SVG string

---

## 7. SVG Sanitization

**File:** `lib/sanitize-svg.ts`

### Requirements

**Remove:**

- `<script>` tags
- `<foreignObject>` tags
- `on*` event attributes
- External URLs

**Enforce:**

- 512x512 viewBox
- No embedded base64 images
- No remote references

**Implementation:**

- Use DOMParser (server-side)
- Whitelisted tag filtering

---

## 8. Storage Design

### 8.1 Object Storage Structure

```
/svgs/{uuid}.svg
/thumbnails/{uuid}.png
/exports/{uuid}-{size}.png
/assets/{category}/{asset}.svg
```

---

## 9. Fabric Editor Design

### 9.1 FabricCanvas Component

**Responsibilities:**

- Initialize canvas
- Load base SVG
- Enable object selection
- Serialize state
- Emit change events

**Load Base SVG:**

```javascript
fabric.loadSVGFromURL(svgUrl, (objects, options) => {
  const obj = fabric.util.groupSVGElements(objects, options);
  canvas.add(obj);
  canvas.centerObject(obj);
});
```

### 9.2 State Management (Zustand)

**Store:**

```typescript
{
  canvas: fabric.Canvas | null,
  layers: LayerMeta[],
  selectedObjectId?: string
}
```

---

## 10. Accessory System

### 10.1 Asset Metadata

```typescript
{
  id: "horns_dragon_01",
  category: "horns",
  svgUrl: string,
  defaultZ: 30
}
```

### 10.2 Add Accessory Flow

1. Load SVG
2. Set position
3. Set z-index
4. Add to canvas
5. Track in layer store

---

## 11. Export System

### 11.1 Client-Side Export

**SVG:**

```javascript
canvas.toSVG()
```

**PNG:**

```javascript
canvas.toDataURL({
  format: "png",
  multiplier: 2
})
```

**Available Sizes:**

- 128px
- 256px
- 512px

### 11.2 Server Export (Future)

Use SVG → PNG rasterizer for consistency.

---

## 12. Performance Controls

| Control | Value |
|---------|-------|
| Max layer count | 15 |
| Max SVG node count | 3000 |
| Overly complex AI output | Reject |
| Canvas object caching | Enabled |
| Autosave | Throttled |

---

## 13. Security Considerations

- SVG sanitization mandatory
- Rate limit AI endpoint
- Max prompt length enforced
- Validate object storage access
- Signed URLs for private designs

---

## 14. Error Handling Strategy

| Scenario | Handling |
|----------|----------|
| AI timeout | Return retryable error |
| Invalid SVG | Reject and regenerate |
| Fabric load failure | Show fallback + regenerate option |
| Storage failure | Retry upload |

---

## 15. Logging & Monitoring

- Log AI generation time
- Log SVG complexity metrics
- Track generation cost
- Track export usage

---

## 16. Future Scalability

- Add user accounts
- Add credit system
- Add premium AI model
- Add marketplace
- Add asset pack monetization
- Add AI remix feature

---

## 17. MVP Development Order

| Step | Deliverables |
|------|--------------|
| **Step 1** | Basic UI, Fabric canvas working |
| **Step 2** | AI endpoint, SVG load |
| **Step 3** | Save system |
| **Step 4** | Export |
| **Step 5** | Accessory pack |

---

## 18. Dev Environment Setup

**Required:**

- Node 20+
- Next.js 15
- Postgres
- S3 bucket
- AI provider API key
