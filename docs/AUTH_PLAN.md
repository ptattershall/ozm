# Auth.js Integration Plan — Fantasy Emoji Forge

> **Goal:** Add authentication with Auth.js so we have a stable user identity for designs, future free credits, and subscriptions. Auth is optional at first (anonymous use still allowed); we gradually tie features to sign-in.

---

## 1. Why Auth.js

- **Next.js–native:** App Router, Server Components, middleware support.
- **Self-hosted:** Sessions and user data in your Postgres; no per-user SaaS cost.
- **Flexible:** Credentials (email/password), OAuth (Google, GitHub), magic links.
- **Familiar:** You’re already comfortable with it.
- **Fits the product:** We need a reliable `userId` for designs, credits, and Stripe. Auth.js provides identity; we build credits/billing on top.

---

## 2. Current State

- **Design model** has optional `userId` (String?) — ready for ownership.
- **No auth today:** All routes are unauthenticated; designs are not tied to users.
- **APIs:** `save-design`, `load-design`, `upload-export` do not check or set `userId`.
- **UI:** No sign-in, sign-out, or “My Designs”; header has Save but no account actions.

---

## 3. Target State (Post–Auth)

- **Sign-in / sign-up** available (credentials and/or OAuth); **sign-out** in header or menu.
- **Session** available server- and client-side via `auth()`, `useSession()`.
- **Designs** optionally associated with `userId` on save; load/list can be scoped to the current user when we add “My Designs”.
- **Anonymous use (optional):** We can keep allowing create/edit without sign-in; saving may require sign-in or we allow anonymous saves and later “claim” with account. Plan assumes we **allow anonymous use** for create/design; **save** can require sign-in or attach `userId` when present.
- **Future:** Credits and subscriptions keyed by the same `userId`.

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Client (Next.js App Router)                                     │
│  - SessionProvider in layout (client)                            │
│  - Header: Sign In / Sign Out, optional “My Designs”             │
│  - Pages: /create, /design/[id] (work with or without session)   │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Auth.js                                                         │
│  - auth.ts (config: providers, adapter, callbacks)               │
│  - app/api/auth/[...nextauth]/route.ts (handler)                 │
│  - middleware.ts (optional: protect /design/* or /create)       │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│  Postgres (Prisma)                                               │
│  - User, Account, Session, VerificationToken (Auth.js schema)    │
│  - Design.userId (optional → required when we require sign-in)  │
└─────────────────────────────────────────────────────────────────┘
```

- **Auth.js** stores users and sessions via **Prisma Adapter** in the existing database.
- **Design** already has `userId`; we only need to set it from the session in `save-design` and optionally enforce it in `load-design` / list when we add “My Designs”.

---

## 5. Decisions

| Topic | Choice | Notes |
|-------|--------|--------|
| **Auth package** | Auth.js (next-auth v5) | Next.js standard, Prisma adapter. |
| **Session strategy** | JWT or database | Database sessions with Prisma adapter are typical; JWT is an option. |
| **Providers** | Start with Credentials (email/password) | Add OAuth (Google, GitHub) when needed. |
| **Anonymous use** | Allowed initially | Create and edit without sign-in; save attaches `userId` when signed in. Optionally require sign-in to save later. |
| **Protected routes** | None at first | No route protection initially; optional middleware later for “My Designs” or paid features. |
| **Sign-in/sign-up UI** | Dedicated pages | e.g. `/signin`, `/signup` (or single `/auth` with tabs). |

---

## 6. What Gets Added

- **Dependencies:** `next-auth`, `@auth/prisma-adapter` (adapter matches Auth.js + Prisma).
- **Prisma:** Auth.js models (`User`, `Account`, `Session`, `VerificationToken`) and relation `Design.userId` → `User.id`.
- **Auth config:** `auth.ts` (or `auth.config.ts`) with Credentials provider and Prisma adapter.
- **API route:** `app/api/auth/[...nextauth]/route.ts`.
- **Session provider:** Client component wrapping `children` in `app/layout.tsx`.
- **Env:** `AUTH_SECRET`, optionally `AUTH_*` for OAuth.
- **UI:** Sign-in and sign-up pages; header sign-in/sign-out and optional user menu.
- **API changes:** `save-design` reads session and sets `Design.userId`; `load-design` unchanged at first (we can scope by user when we add “My Designs”).

---

## 7. What Gets Modified

- **Prisma schema:** Add Auth.js tables; ensure `Design.userId` references `User.id`.
- **app/layout.tsx:** Wrap with `SessionProvider`.
- **app/api/save-design/route.ts:** Get session (e.g. `auth()`); set `userId` on create/update when session exists.
- **Header (DesignEditor or shared):** Add Sign In / Sign Out (and later “My Designs”).
- **.env.example:** Document `AUTH_SECRET` and any OAuth vars.
- **Optional:** Middleware to protect specific routes or redirect after sign-in.

---

## 8. Out of Scope (For Later)

- **Credits / usage:** Model and logic for free credits (separate task).
- **Stripe / subscriptions:** Billing and paywall (separate task).
- **“My Designs” page:** List designs by `userId` with thumbnails (checklist item 13 in main checklist).
- **Email verification:** Can add later with a provider or custom flow.
- **OAuth providers:** Add when needed; plan assumes Credentials first.

---

## 9. Implementation Order (High Level)

1. Install Auth.js and Prisma adapter; add Auth.js models to Prisma and run migration.
2. Add auth config and API route; add `AUTH_SECRET` to env.
3. Add SessionProvider and sign-in/sign-up UI; wire header (sign in / sign out).
4. Update `save-design` to set `Design.userId` from session.
5. Test: sign in, save design, confirm `userId` on the design; sign out and optional anonymous flow.
6. Later: “My Designs” and route protection as needed.

---

See **AUTH_CHECKLIST.md** for the step-by-step implementation checklist.
