# proGym Web — Coach Dashboard

## What This Is

A Next.js web dashboard for **gym coaches and club admins**. It is the management interface for the proGym ecosystem — the mobile app (React Native/Expo, separate repo at `../proGym`) is where players train. This web app is staff-only: only admins and coaches log in here. Players never touch this dashboard.

The two apps share the same Supabase backend (same PostgreSQL database, same Auth).

## Current State

### What's built and wired to real data

- Auth: email/password login (`/auth/login`), sign-up (`/auth/signup`), sign-out server action
- Dashboard layout: auth guard, club guard, Sidebar + Topbar shell
- Club creation: `/club/new` — shown when user is authenticated but has no club yet
- **Team** (`/team`): real member list from `club_members` + `profiles`, with groups column
- **Planteles / Squads** (`/squads`): real group list from `club_groups`, create group form
- **Squads detail** (`/squads/[id]`): group member list, add/remove members
- **Invitations** (`/invitations`): active invite codes separated by role (coach / player), generate + revoke

### Not yet implemented (stubs or missing pages)

- Dashboard home (`/dashboard`) — currently shows a placeholder
- Calendar (`/calendar`) — stub
- Routines (`/routines`) — stub; this is where coaches will share routines with groups/players
- Analytics (`/analytics`) — stub
- Video analysis (`/video-analysis`) — stub
- Settings (`/settings`) — stub
- Team member detail (`/team/[id]`) — links exist in the table but page not built
- Forms / questionnaires (DB tables exist: `club_forms`, `club_form_questions`, `club_form_distributions`, `club_form_responses`, `club_form_answers`)

## Tech Stack

- **Next.js 16** — App Router, TypeScript throughout
- **Supabase** — `@supabase/ssr` for server-side auth, `@supabase/supabase-js` for browser client
- **lucide-react** — icons (no other icon library)
- **recharts** — for charts when analytics is built
- **@tanstack/react-query**, **zustand** — available but not yet used widely
- **Tailwind v4** — installed but used minimally; see Style Rules below

## Project Structure

```
app/
  (dashboard)/          # All authenticated dashboard pages
    layout.tsx          # Auth + club guard; wraps in ClubProvider + Sidebar
    dashboard/page.tsx  # Home (placeholder)
    team/page.tsx       # Member list
    squads/page.tsx     # Group list
    squads/[id]/page.tsx # Group detail + member management
    invitations/page.tsx # Invite codes
    invitations/actions.ts # generateInvitation, revokeInvitation server actions
    squads/actions.ts   # createGroup, updateGroup, deleteGroup server actions
  auth/
    login/page.tsx
    signup/page.tsx
    actions.ts          # signOut server action
  club/
    new/page.tsx        # Club creation (post-signup, no-club state)
  globals.css           # CSS variable definitions
  layout.tsx            # Root layout (font, metadata)

components/
  dashboard/
    Sidebar.tsx         # Nav sidebar (client component)
    Topbar.tsx          # Page header with title/subtitle/actions slot
  club/
    ClubCreatorForm.tsx # Club creation form (client component)
    CreateGroupForm.tsx # New group form (client component)
    InvitationCard.tsx  # Single invite code card with copy + revoke
    GenerateCodeForm.tsx # Generate coach/player code (client component)

lib/
  supabase/
    client.ts           # Browser Supabase client (createBrowserClient)
    server.ts           # Server Supabase client (createServerClient with cookies)
  auth.ts               # getCurrentUser(), getCurrentMembership() server helpers
  clubContext.tsx        # ClubProvider + useClubContext() — holds club + membership client-side

types/
  club.ts               # ClubRole, Club, ClubMember, ClubGroup, ClubInvitation, etc.
```

## Style Rules — Important

**Use inline CSS with `--pg-*` variables. Do not use Tailwind utility classes in components.**

The design tokens are defined in `app/globals.css`:

```
Surfaces:  --pg-bg (#0D0D0D)  --pg-card (#141414)  --pg-surface (#1C1C1C)  --pg-c3 (#242424)  --pg-c4 (#2C2C2C)
Borders:   --pg-border (rgba white 7%)  --pg-border2 (rgba white 13%)
Text:      --pg-text (#fff)  --pg-muted (rgba white 38%)  --pg-disabled (rgba white 15%)
Accent:    --pg-accent (#D4A853 gold)  --pg-accent-lt  --pg-accent-text (#0D0D0D)  --pg-accent-bg  --pg-accent-alt
Semantic:  --pg-blue (#4A90D9)  --pg-blue-dim  --pg-purple  --pg-amber  --pg-green (#4CAF50)  --pg-red (#E53935)
Status bg: --pg-green-bg  --pg-amber-bg  --pg-red-bg  --pg-blue-bg
Other:     --pg-row-hover (use class "pg-row" for hover rows)
```

**Typography sizing conventions** (keep consistent with existing pages):
- Labels / column headers: 8–10px, uppercase, letter-spacing
- Body / table rows: 11–13px
- Section headings: 14–16px, fontWeight 700
- Page titles: passed to Topbar, rendered at ~18px

**Border radius conventions**: cards 8–10px, buttons 7–10px, badges 4–6px, inputs 9px

**Role badge colors**: admin → `--pg-red` / `--pg-red-bg`, coach → `--pg-blue` / `--pg-blue-bg`, player → `--pg-accent` / `--pg-accent-bg`

## Rules

- **All user-facing text must be in Spanish** — labels, errors, empty states, tooltips, everything
- **No emojis** in the UI
- **No Tailwind utility classes** in component JSX — inline styles with `--pg-*` variables only. The `pg-row` class (defined in globals.css) is the one allowed exception for hover rows.
- **New pages** go under `app/(dashboard)/` if they're dashboard pages (auth-guarded), or `app/` for public pages
- **New reusable components** go in `components/` — dashboard shell components in `components/dashboard/`, club-related forms/cards in `components/club/`
- **Server actions** go in `actions.ts` files co-located with the page that uses them
- **Shared types** go in `types/` — never inline type definitions in page files for types that are reused
- **Database changes** need a new numbered migration file in the mobile project (`../proGym/supabase/migrations/`) since both apps share the same Supabase project
- **Server components by default** — pages fetch data server-side using `getCurrentMembership()` + `createClient()`. Only add `"use client"` when the component needs interactivity (forms, clipboard, state)
- **Auth pattern**: every dashboard page calls `getCurrentMembership()` and redirects to `/auth/login` if no user, or `/club/new` if no club membership. The layout already does this, but individual pages do it too as a safety net.

## Auth Flow

```
/auth/login → signInWithPassword → router.push("/dashboard")
/auth/signup → signUp → router.push("/club/new")
/club/new → create club (INSERT clubs + club_members as admin) → router.push("/dashboard")
Dashboard layout → getCurrentMembership() → if !user: /auth/login, if !club: /club/new
```

Coaches and players share the same Supabase Auth. The difference is their `club_members.role` — `admin` or `coach` can log into this web app; `player` accounts exist but are mobile-only.

## Database Tables (relevant to this app)

```sql
clubs             (id, name, description, logo_url, created_by, created_at)
club_members      (id, club_id, user_id, role ['admin'|'coach'|'player'], status, joined_at)
                  — UNIQUE(user_id): one club per user
club_groups       (id, club_id, name, description, created_by, created_at)
club_group_members(id, group_id, user_id, added_by, added_at)
club_invitations  (id, club_id, created_by, code, role ['coach'|'player'],
                   max_uses, uses_count, expires_at, target_group_id, status, created_at)
profiles          (id, name, username, ...)

-- Forms (built in DB, not yet surfaced in UI)
club_forms               (id, club_id, created_by, title, description, status, created_at)
club_form_questions      (id, form_id, type ['text'|'scale'|'multiple_choice'|'yes_no'], question_text, options jsonb, order_index, required)
club_form_distributions  (id, form_id, target_type ['group'|'player'], target_id, due_at, created_by)
club_form_responses      (id, distribution_id, user_id, submitted_at)
club_form_answers        (id, response_id, question_id, answer_text, answer_number, answer_options jsonb)

-- Routine sharing (built in DB, not yet surfaced in UI)
routine_shares    (id, routine_id, club_id, created_by, target_type ['group'|'player'], target_id, created_at)
```

RLS is enabled on all tables. Helper functions `is_club_staff(club_id)` and `is_club_member(club_id)` are used by policies. `redeem_club_invitation(p_code)` is a SECURITY DEFINER function used by the mobile app.

## Supabase Helpers

```typescript
// Server components / server actions:
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // reads cookies for session

// Client components:
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // browser client

// Auth helpers (server-side):
import { getCurrentMembership } from "@/lib/auth";
const { user, membership, club } = await getCurrentMembership();

// Club context (client-side, inside dashboard layout):
import { useClubContext } from "@/lib/clubContext";
const { club, membership, isStaff } = useClubContext();
```

## Topbar Usage

```tsx
import Topbar from "@/components/dashboard/Topbar";

<Topbar
  title="Página"
  subtitle="descripción opcional"
  actions={<button>Acción</button>}  // optional
/>
```

Topbar handles its own padding and border — don't add extra wrappers around it.

## Adding a New Dashboard Page

1. Create `app/(dashboard)/my-page/page.tsx` as an async Server Component
2. Start with the auth/club guard:
   ```typescript
   const { user, membership, club } = await getCurrentMembership();
   if (!user) redirect("/auth/login");
   if (!membership || !club) redirect("/club/new");
   ```
3. Fetch data server-side with `createClient()`
4. Return JSX with `<Topbar>` + scrollable content area
5. Add to the `NAV` array in `components/dashboard/Sidebar.tsx` with the right `lucide-react` icon
