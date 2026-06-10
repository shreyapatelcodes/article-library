# Article Library — Multi-User PRD

## Vision
A personal, cloud-synced reading list and knowledge graph. Every user signs in and gets their own private library — paste a link, get AI-extracted metadata, track read status, tag topics, and see how interests connect visually.

## Users
Anyone with an email. No invite required.

## Core User Stories
1. **Sign in** — visit the app, click Sign in, authenticate via email or OAuth.
2. **Add article** — paste a URL, press Enter; Claude extracts title, author, summary, and topics automatically.
3. **Browse** — filter by read/unread, topic, or tagged-for person.
4. **Read tracking** — mark articles read/unread from the card or detail panel.
5. **Organise** — edit topics and tag articles for specific people.
6. **Knowledge graph** — visualise topic connections across the library.
7. **Share** — compose an email with a link and note, prefilled for tagged people.
8. **Sign out** — library is private; switching accounts shows a different library.

## Non-goals (v1)
- Public / shared libraries
- Collaborative editing
- Per-user email inbound routing (inbound.js is a global inbox for now)
- Mobile app

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Auth | **Clerk** | Drop-in vanilla JS, hosted sign-in modal, free to 10k MAU |
| Database | **Upstash KV (Redis)** | Already in package.json; `articles:{userId}` key per user; free tier fits |
| AI | **Claude Haiku** | Already integrated; extracts metadata on article save |
| Hosting | **Vercel** | Already configured |
| Frontend | Vanilla HTML/CSS/JS | No framework — keeps the existing codebase intact |

## Data Model

**Key:** `articles:{userId}` → JSON array of `Article[]` (newest first)

```ts
type Article = {
  id: string           // "art_{timestamp}"
  url: string
  title: string | null
  author: string | null
  source: string | null
  date_saved: string   // "YYYY-MM-DD"
  date_read: string | null
  status: "read" | "unread"
  summary: string | null
  notes: string
  topics: string[]
  tagged_for: string[]
}
```

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/config` | None | Returns `CLERK_PUBLISHABLE_KEY` for frontend Clerk init |
| GET | `/api/articles` | JWT | Returns user's article array from KV |
| POST | `/api/add` | JWT | Fetches URL metadata, appends article to KV, returns article |
| POST | `/api/sync` | JWT | Replaces user's article array in KV (bulk state save) |
| POST | `/api/inbound` | Webhook secret | Email-to-article (global inbox, v1) |

## State Management
- `allArticles[]` is the canonical in-memory state on the client
- On load: `GET /api/articles` populates `allArticles`
- On add: `POST /api/add` → server saves to KV, frontend appends to `allArticles`
- On mutate (read, topic, tag, delete): update `allArticles` in memory, debounced `POST /api/sync` persists after 1.5s
- No localStorage — data is fully server-side, works across devices

## Environment Variables

```
CLERK_PUBLISHABLE_KEY   # pk_test_... or pk_live_... from Clerk dashboard
CLERK_SECRET_KEY        # sk_test_... or sk_live_... from Clerk dashboard
UPSTASH_REDIS_REST_URL  # from Upstash dashboard
UPSTASH_REDIS_REST_TOKEN
ANTHROPIC_API_KEY       # for Claude metadata extraction
```

## Setup Steps
1. [clerk.com](https://clerk.com) → create app → copy publishable + secret key
2. [upstash.com](https://upstash.com) → create Redis DB → copy REST URL + token
   *(or install both via Vercel Marketplace for automatic env injection)*
3. Add all env vars to Vercel project settings
4. Deploy — `vercel --prod`
