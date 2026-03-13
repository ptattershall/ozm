# Fantasy Emoji Forge

A web-based sticker-style fantasy emoji creator powered by AI. Generate custom fantasy emojis, edit them with a powerful canvas editor, and export for Discord, Twitch, and social media.

## Features

- **AI-Powered Generation** — Describe your concept (e.g., "Goblin wizard with glowing eyes") and get a clean, editable SVG
- **Fabric.js Editor** — Full-featured canvas editor with move, scale, rotate, opacity, and layer controls
- **Accessory System** — Add horns, auras, weapons, hats, and FX layers from curated SVG packs
- **Export Options** — Download as SVG or PNG (128px, 256px, 512px)
- **Save & Reload** — Persist your designs and continue editing later

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Canvas Editor | Fabric.js |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Forms | React Hook Form + Zod |
| Database | PostgreSQL (Prisma ORM) |
| Storage | S3 / Cloudflare R2 |
| AI | SVG Generation Provider |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- S3-compatible storage bucket
- AI provider API key

### Installation

1. Clone the repository:

```bash
git clone <repo-url>
cd ozmoji
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env
```

4. Configure your `.env` file:

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/ozmoji

# Storage (S3 / R2)
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key

# AI Provider
AI_PROVIDER_API_KEY=your-api-key
```

5. Run database migrations:

```bash
npx prisma migrate dev
```

6. Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
/app
  /create              # Prompt input + generation
  /design/[id]         # Canvas editor
  /api
    /generate-svg      # AI generation endpoint
    /save-design       # Save design to DB
    /load-design       # Load design from DB

/components
  /editor
    FabricCanvas.tsx   # Main canvas component
    LayerPanel.tsx     # Layer management
    AccessoryPanel.tsx # SVG accessories
    PropertiesPanel.tsx# Object properties
    ExportPanel.tsx    # Export options

/lib
  ai.ts               # AI provider wrapper
  sanitize-svg.ts     # SVG security sanitization
  storage.ts          # S3/R2 storage utilities
  canvas-utils.ts     # Fabric.js helpers
  zod-schemas.ts      # Validation schemas

/store
  editor-store.ts     # Zustand editor state

/prisma
  schema.prisma       # Database schema
```

## Documentation

Detailed documentation is available in the `/docs` folder:

- [Product Requirements Document](./docs/PRD_OZMOJi.md) — Vision, goals, user flows, and requirements
- [Technical Design Document](./docs/TDD_OZMOJI.md) — Architecture, API design, and implementation details
- [Implementation Checklist](./docs/IMPLEMENTATION_CHECKLIST.md) — Step-by-step development checklist

## MVP Roadmap

| Phase | Deliverables |
|-------|--------------|
| Phase 1 | AI → SVG generation, Fabric editor, Export (no login) |
| Phase 2 | Save system, Authentication, Asset packs |
| Phase 3 | Marketplace, Premium AI models, Animation |

## License

MIT
