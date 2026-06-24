# Exercise Planner — Personal Reference

A cheat sheet for understanding this codebase. Skim the headings; drill in where you need to.

---

## What the app does

1. User signs in with **Google OAuth**
2. Fills out a 3-step form (goals → fitness level → schedule)
3. **Claude** generates a personalized day-by-day workout plan
4. Each day is auto-added to the user's **Google Calendar** with reminders
5. A confirmation email is sent via the user's **Gmail**

---

## Tech stack at a glance

| Layer | Technology | Why |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) | File-based routing, dev server, build system |
| UI library | React 18 + TypeScript | Components + state |
| Styling | Tailwind CSS | Utility classes |
| Backend framework | FastAPI (Python) | Async, type-driven validation, decorator routing |
| Backend server | Uvicorn | Runs the FastAPI app |
| Database (prod) | Postgres on Supabase | Hosted, persistent |
| Database (local) | SQLite (file) | Zero setup |
| ORM | SQLAlchemy | Python objects ↔ SQL, dialect-agnostic |
| AI | Anthropic Claude (`claude-sonnet-4-6`) | JSON-schema-constrained plan generation |
| Auth | Google OAuth2 + JWT cookie | Identity + access to Calendar/Gmail |
| Deployment | Render (backend) | Defined in `backend/render.yaml` |

---

## Project map (where to look for what)

```
exercise-planner/
├── backend/
│   ├── main.py                    ← FastAPI app, CORS, mounts routers
│   ├── database.py                ← SQLAlchemy setup, SQLite↔Postgres swap
│   ├── models.py                  ← User + Plan tables (the whole schema)
│   ├── requirements.txt           ← Python deps
│   ├── render.yaml                ← Production deploy config
│   ├── routers/
│   │   ├── auth.py                ← Google OAuth flow + JWT cookie
│   │   └── plans.py               ← Create / read / delete plans (SSE stream)
│   └── services/
│       ├── claude_service.py      ← Calls Claude with JSON-schema output
│       ├── calendar_service.py    ← Creates/deletes Google Calendar events
│       └── gmail_service.py       ← Sends HTML confirmation email
│
└── frontend/
    ├── app/                       ← Next.js routes (file = URL)
    │   ├── layout.tsx             ← Wraps every page
    │   ├── page.tsx               ← `/` landing page
    │   ├── not-found.tsx          ← Custom 404
    │   ├── auth/callback/page.tsx ← OAuth fallback loader
    │   ├── onboard/page.tsx       ← `/onboard` — renders GoalForm
    │   └── dashboard/page.tsx     ← `/dashboard` — loads + renders PlanView
    ├── components/
    │   ├── GoalForm.tsx           ← 3-step form, consumes SSE stream
    │   └── PlanView.tsx           ← Renders the generated plan
    ├── lib/
    │   └── api.ts                 ← Typed wrapper around fetch() to backend
    ├── next.config.ts             ← Whitelists Google avatar domain
    └── package.json
```

---

## How to run locally

**Backend** (from `backend/`):
```bash
source venv/bin/activate
uvicorn main:app --reload
# → http://localhost:8000  (docs at /docs)
```

**Frontend** (from `frontend/`):
```bash
npm run dev
# → http://localhost:3000
```

Requires `backend/.env` with: `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`. See `.env.example`.

---

## The big mental model — full request flow

```
User → /onboard → fills form → clicks "Generate"
  │
  ▼
GoalForm.tsx → POST /api/plans (with JWT cookie)
  │
  ▼
FastAPI:
  • Validates body (CreatePlanRequest)
  • Resolves get_current_user() from JWT cookie
  • Resolves get_db() session
  │
  ▼
plans.py: create_plan() opens an SSE stream:
  1. claude_service.generate_plan_stream() — streams JSON chunks
  2. INSERT new Plan row in DB
  3. calendar_service.create_workout_events() — creates Google events
  4. UPDATE Plan with calendar_event_ids
  5. gmail_service.send_plan_confirmation() — sends email
  6. Emits "complete" SSE event with plan_id
  │
  ▼
GoalForm reads SSE events live → shows checkmarks → router.push("/dashboard")
  │
  ▼
Dashboard fetches GET /api/plans/current → PlanView renders the plan
```

---

## Concepts to know (quick definitions)

### Frontend

- **File-based routing** — `app/foo/page.tsx` is auto-served at `/foo`. No router config.
- **`layout.tsx`** — wraps every page. Root one is `app/layout.tsx`.
- **`"use client"`** — top-of-file directive marking a component as browser-side. Required for `useState`, `useEffect`, `onClick`, etc.
- **`useRouter()`** — Next.js hook returning a router object. `router.push("/x")` navigates without a full page reload.
- **`<Image>`** — Next.js's optimized image component. External domains must be whitelisted in `next.config.ts`.
- **`NEXT_PUBLIC_*` env vars** — only these are exposed to the browser; everything else stays server-only.

### Backend

- **Decorator routing** — `@router.get("/path")` registers an endpoint.
- **`APIRouter`** — lets you split endpoints across files; mounted with a prefix in `main.py`.
- **Pydantic models** — Python classes (e.g. `CreatePlanRequest`) that auto-validate request bodies.
- **`Depends(...)`** — FastAPI's dependency injection. Used for `get_db` (session) and `get_current_user` (auth).
- **`HTTPException`** — raise to return a JSON error with a status code.
- **`StreamingResponse` + SSE** — used to stream Claude's output and status updates to the browser as they happen.
- **`CORSMiddleware`** — needed because frontend (`:3000`) and backend (`:8000`) are on different origins.

### Database

- **SQLAlchemy** — ORM. `Base` is the parent class; each subclass = one table.
- **`Base.metadata.create_all`** — auto-creates tables on startup (no migrations).
- **Two tables, that's it:**
  - `users` — Google identity + stored OAuth tokens
  - `plans` — generated plan JSON + Google Calendar event IDs
- **`postgres://` → `postgresql://` rewrite** — Supabase hands you `postgres://` but SQLAlchemy requires `postgresql://`. Handled in `database.py:11-12`.

### Auth

- **Google OAuth2** — user grants the app access to their Calendar + Gmail. Tokens stored in the `users` table.
- **JWT cookie** — after OAuth, the backend mints a JWT and sets it as an httpOnly cookie. Every subsequent request authenticates via that cookie.
- **`samesite=none; secure=true`** — required for the cookie to flow cross-domain in production (frontend and backend on different hosts).

### AI

- **JSON-schema-constrained output** — Claude is given a strict schema (`PLAN_SCHEMA` in `claude_service.py:10-48`) and is guaranteed to return JSON matching it. No parsing hacks needed.
- **Streaming** — Claude's response is streamed token-by-token via `client.messages.stream(...)`, which the backend re-emits as SSE chunks.

---

## "Where do I look if I want to change..." cheat sheet

| I want to change… | Edit… |
|---|---|
| The AI's system prompt or instructions | `backend/services/claude_service.py:50-62` |
| The shape of the generated plan | `PLAN_SCHEMA` in `backend/services/claude_service.py:10-48` |
| Calendar event format / reminders | `backend/services/calendar_service.py:60-80` |
| Confirmation email HTML | `backend/services/gmail_service.py:57-106` |
| The 3-step form fields or copy | `frontend/components/GoalForm.tsx` |
| How a plan is displayed | `frontend/components/PlanView.tsx` |
| Database schema | `backend/models.py` (then delete `exercise_planner.db` to recreate locally) |
| Add a new API endpoint | New file in `backend/routers/`, mount in `backend/main.py` |
| Add a new page route | New `app/<route>/page.tsx` in frontend |
| OAuth scopes | `SCOPES` in `backend/routers/auth.py:28-34` |
| API base URL (frontend → backend) | `frontend/.env.local` (`NEXT_PUBLIC_API_URL`) |

---

## Database touch points (the whole DB surface area — just 8)

**Reads:**
- `auth.py:62` — lookup user by id (used by every authenticated endpoint)
- `auth.py:115` — lookup user by `google_id` during OAuth
- `plans.py:158-163` — user's most recent plan
- `plans.py:175` — specific plan by id

**Writes:**
- `auth.py:118-131` — upsert user + Google tokens on OAuth callback
- `plans.py:91-101` — insert new Plan after Claude generates it
- `plans.py:115-116` — update Plan with calendar event IDs
- `plans.py:199-200` — delete Plan (and its calendar events)

---

## Mental shortcut: Next.js ↔ FastAPI mirror

| Concern | Next.js (frontend) | FastAPI (backend) |
|---|---|---|
| Built on | React | Python |
| Routing | File-based (`app/*/page.tsx`) | Decorator-based (`@router.get(...)`) |
| Dev server | `next dev` | `uvicorn main:app --reload` |
| Type safety | TypeScript | Pydantic + type hints |
| What it serves | HTML + JS | JSON + SSE streams |
