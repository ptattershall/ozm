# Auth.js Implementation Checklist

> **Reference:** [AUTH_PLAN.md](./AUTH_PLAN.md) for strategy and architecture.  
> **Scope:** Add Auth.js (next-auth v5) with Prisma adapter; optional session; tie designs to user on save.

---

## Table of Contents

1. [Dependencies & env](#1-dependencies--env)
2. [Database (Prisma)](#2-database-prisma)
3. [Auth config & API route](#3-auth-config--api-route)
4. [Session provider & layout](#4-session-provider--layout)
5. [Sign-in / Sign-up UI](#5-sign-in--sign-up-ui)
6. [Header: sign in / sign out](#6-header-sign-in--sign-out)
7. [API changes: save-design & load-design](#7-api-changes-save-design--load-design)
8. [Optional: middleware & route protection](#8-optional-middleware--route-protection)
9. [Docs & cleanup](#9-docs--cleanup)

---

## 1. Dependencies & env

- [x] Install Auth.js and Prisma adapter  
  - [x] `next-auth` (v5)  
  - [x] `@auth/prisma-adapter`
- [x] Add env vars to `.env.example` (and document in README if needed)  
  - [x] `AUTH_SECRET` (required; e.g. `openssl rand -base64 32`)  
  - [x] Optional: `AUTH_URL` if different from `NEXT_PUBLIC_APP_URL`  
  - [x] Optional: OAuth vars later (e.g. `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`)

---

## 2. Database (Prisma)

- [x] Add Auth.js models to `prisma/schema.prisma`  
  - [x] `User` (id, name, email, emailVerified, image)  
  - [x] `Account` (userId, type, provider, providerAccountId, refresh_token, access_token, expires_at, etc.)  
  - [x] `Session` (userId, sessionToken, expires)  
  - [x] `VerificationToken` (identifier, token, expires)  
  - Copy from [Auth.js Prisma adapter docs](https://authjs.dev/getting-started/adapters/prisma) (PostgreSQL tab); use camelCase to match existing `Design` model.
- [x] Relate `Design.userId` to `User.id`  
  - [x] Add `user User? @relation(fields: [userId], references: [id])` on `Design`  
  - [x] Add `Design Design[]` on `User`  
  - [x] Keep `userId` optional (nullable) for now.
- [x] Run migration  
  - [x] `npm run db:migrate` — run when database is available  
  - [x] Verify tables and relation.

---

## 3. Auth config & API route

- [x] Create auth configuration  
  - [x] New file: `auth.ts` at project root (or `lib/auth.ts`)  
  - [x] Use `NextAuth` with `PrismaAdapter(prisma)` from `@/lib/db`  
  - [x] Add **Credentials** provider (email + password) for sign-in  
  - [x] Configure `session` strategy (e.g. database) and `callbacks` so `session.user.id` and `session.user.email` are available  
  - [x] Export `handlers`, `auth`, `signIn`, `signOut`
- [x] Create API route  
  - [x] `app/api/auth/[...nextauth]/route.ts`  
  - [x] Export GET/POST from `handlers` (Auth.js v5 pattern)
- [x] Verify: hit `/api/auth/providers` or sign-in flow and confirm no runtime errors.

---

## 4. Session provider & layout

- [x] Add SessionProvider (client component)  
  - [x] Create `components/providers/SessionProvider.tsx` (or use `next-auth/react` `SessionProvider`)  
  - [x] Wrap children with `<SessionProvider session={session}>` if needed; Auth.js v5 may use different pattern — follow current docs.
- [x] Update root layout  
  - [x] In `app/layout.tsx`, wrap `{children}` with the session provider so `useSession()` works in client components.  
  - [x] Ensure provider is inside `<body>`.

---

## 5. Sign-in / Sign-up UI

- [x] Sign-in page  
  - [x] Create `app/(auth)/signin/page.tsx` (or `app/signin/page.tsx`)  
  - [x] Form: email, password; submit to Auth.js Credentials (e.g. `signIn("credentials", { email, password, redirect: false })` then redirect on success)  
  - [x] Link to sign-up if separate page  
  - [x] Accessible labels and error display (e.g. “Invalid credentials”)
- [x] Sign-up page (if using Credentials)  
  - [x] Create `app/(auth)/signup/page.tsx`  
  - [x] Form: name, email, password; create user (custom logic or Auth.js flow — e.g. create User in DB then sign in)  
  - [x] Auth.js Credentials provider typically validates on sign-in; sign-up may require a custom API or adapter logic to create the User. Document approach (e.g. “Credentials + custom sign-up API that creates User then calls signIn”).  
  - [x] Link back to sign-in
- [x] Optional: single `/auth` page with sign-in/sign-up tabs.

---

## 6. Header: sign in / sign out

- [x] Identify where the main header lives  
  - [x] DesignEditor header and/or a shared layout (e.g. home, create).  
- [x] Add sign-in / sign-out and optional user menu  
  - [x] If session: show user email/name and “Sign out” button (call `signOut()`).  
  - [x] If no session: show “Sign in” link to `/signin`.  
  - [x] Use client component and `useSession()` for session state.  
- [x] Ensure “Sign in” is visible on create and design pages (or in a shared header/layout).  
- [ ] Optional: “My Designs” link (can point to a placeholder route until that page exists).

---

## 7. API changes: save-design & load-design

- [x] save-design  
  - [x] In `app/api/save-design/route.ts`, get session (e.g. `const session = await auth()`) at the start of POST.  
  - [x] When creating or updating a design, set `userId: session?.user?.id ?? null` (or leave null if no session).  
  - [x] Ensure Prisma create/update includes `userId` in `data`.  
  - [x] Do not require session for save (allow anonymous); only attach userId when present.
- [x] load-design  
  - [x] No change required initially: continue to load by `id` only.  
  - [ ] Optional: add authorization later (e.g. if design has `userId`, only allow that user or keep public read — document decision).
- [x] upload-export  
  - [x] No change required for now; optional: scope by user later.

---

## 8. Optional: proxy & route protection

- [ ] Decide if any routes are protected  
  - [ ] Plan says “no route protection initially”; skip or add later.
- [ ] If adding proxy later:  
  - [ ] Create `proxy.ts` at project root (Next.js 16; export `proxy`, not `middleware`).  
  - [ ] Use Auth.js in proxy to protect e.g. `/design/*` or `/create` (redirect to sign-in if no session).  
  - [ ] Document in AUTH_PLAN.md when you enable it.

---

## 9. Docs & cleanup

- [x] Update `.env.example` with all new auth vars and short comments.  
- [x] Update main [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md): add an “Auth (Auth.js)” section or link to AUTH_PLAN.md and this checklist.  
- [ ] README: mention sign-in/sign-up and that designs can be tied to the signed-in user.  
- [x] Remove any placeholder or TODO comments added during auth work.

---

## Definition of done

- User can sign up (email/password) and sign in.  
- User can sign out from the header.  
- Saving a design while signed in stores `Design.userId`; saving while signed out leaves `userId` null.  
- Session is available in layout and in API routes via `auth()`.  
- No existing unauthenticated flows are broken (create, design, export still work without signing in).

---

## Next steps (after this checklist)

- Add “My Designs” page (list designs where `Design.userId = session.user.id`; use existing `thumbnailUrl`).  
- Add free-credits model and logic.  
- Add Stripe for subscriptions; gate usage by credits/subscription.
