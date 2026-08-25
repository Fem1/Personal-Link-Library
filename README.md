# Link Library

A local, single-user demo app: paste in links, it scrapes them, auto-categorizes
them by topic using Claude, and gives you a chat box per topic to interrogate
everything you've saved on that subject.

No auth, no multi-user support — this is designed to run on `localhost` for
one person.

## How it works

1. You paste a URL on **[/add](#pages)**.
2. The link is saved immediately with `status: 'pending'`.
3. In the background, the server fetches the page, extracts the title,
   description, and main article text (via [Readability](https://github.com/mozilla/readability)),
   then asks Claude to assign it to an existing topic or propose a new one.
4. The link's row updates to `status: 'ready'` (or `'failed'` if the fetch or
   extraction didn't work out — you can retry it from the UI).
5. Browse everything chronologically on **/timeline**, or grouped by topic on
   **/topics**. Each topic page has a chat box scoped to just that topic's
   saved content — Claude answers only from what you've saved and cites which
   link(s) it's drawing from. The conversation is saved per topic, so it's
   still there next time you visit (until you clear it).

Links whose scrape failed, or whose Claude categorization call failed, land in
a virtual **Uncategorized** bucket on `/topics` rather than blocking them from
showing up elsewhere.

## Stack

- **Next.js** (App Router) + TypeScript
- **SQLite** via `better-sqlite3` — a single file at `data/link-library.db`, no server setup
- **Anthropic API** (`claude-opus-5`) for topic categorization and per-topic chat
- **`@mozilla/readability` + `jsdom`** for extracting article text from scraped HTML
- Tailwind CSS for styling

## Getting started

```bash
npm install
```

Create `.env.local` with an Anthropic API key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/add`.

The SQLite database is created automatically on first run at
`data/link-library.db` (gitignored). Delete that file to start fresh.

> Without an `ANTHROPIC_API_KEY`, adding a link still scrapes and saves it,
> but categorization falls back to Uncategorized, and the chat endpoint
> returns an error.

## Pages

| Route | Description |
| --- | --- |
| `/add` | Paste a URL to save it. Shows the last 5 added links with live status (polls while anything is pending), plus a retry action on failures. |
| `/timeline` | Every link, newest first — title, domain, topic badge, date. |
| `/topics` | One card per topic with a link count, including the Uncategorized bucket. |
| `/topics/[topic]` | Links saved under that topic, plus a chat box scoped to their content. |

## API routes

| Route | Description |
| --- | --- |
| `POST /api/links` | Add a link. Saves it as `pending` and returns immediately; scraping + categorization run in the background. CORS-open (`Access-Control-Allow-Origin: *`) so the [bookmarklet](#bookmarklet) can call it cross-origin from whatever page you're on. |
| `GET /api/links` | All links, newest first. |
| `POST /api/links/[id]/retry` | Re-run scrape + categorization for a link (e.g. after a failure). |
| `GET /api/topics` | Distinct topics with link counts. |
| `GET /api/topics/[topic]` | Links saved under a topic. |
| `GET /api/topics/[topic]/chat` | That topic's chat history, oldest first. |
| `POST /api/topics/[topic]/chat` | Send a chat message; Claude responds using only that topic's saved content. Persists both the user message and the reply. |
| `DELETE /api/topics/[topic]/chat` | Clear a topic's chat history. |

## Data model

No separate topics table — distinct topics are computed by grouping `links`,
which keeps things simple and easy to change later.

```sql
CREATE TABLE links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  full_text TEXT,        -- scraped article body, used as chat context
  topic TEXT,             -- assigned by Claude; NULL until categorized (or if categorization failed)
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'ready' | 'failed'
  image_url TEXT          -- thumbnail, extracted during scraping; NULL if none found
);

CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,    -- matches the topic string above, not a foreign key
  role TEXT NOT NULL,     -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

`chat_messages.topic` is a plain string match against `links.topic`, not a
foreign key — there's no topic table to key against, and topic
renaming/reassignment isn't built yet, so this doesn't need to handle that.

## Bookmarklet

A bookmark whose URL is a `javascript:` snippet, so clicking it on any page
sends that page's URL straight to your locally-running Link Library — no need
to copy/paste into `/add`.

```
javascript:(function(){fetch('http://localhost:3000/api/links',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:window.location.href})}).then(function(r){if(r.status===201){alert('Saved!');}else if(r.status===409){alert('Already saved');}else{alert('Failed - is the app running?');}}).catch(function(){alert('Failed - is the app running?');});})();
```

**Install (Chrome or Safari):**
1. Make sure your bookmarks bar is visible (Chrome: `Cmd+Shift+B`; Safari: `View > Show Favorites Bar`).
2. Bookmark any page, then edit that bookmark:
   - Chrome: right-click the bookmarks bar → **Add page** (or right-click an existing bookmark → **Edit**).
   - Safari: **Bookmarks > Add Bookmark**, then **Bookmarks > Edit Bookmarks** to change its address.
3. Name it something like **Save to Link Library**, and paste the snippet above as the URL/address (replacing whatever's there — it must start with `javascript:`).
4. Save. With the app running (`npm run dev`), click the bookmark on any page to save it.

Only works while the dev server is running locally on this machine — clicking it with the app stopped shows "Failed - is the app running?".

## Notable decisions

- **Chat history is persisted per topic** in `chat_messages`, keyed by the
  topic string (see [Data model](#data-model)). The client still sends its
  own running conversation as `history` on each `POST` — the table is a
  write-through log for reload/revisit, not (yet) the server-side source of
  truth for what gets sent to Claude each turn.
- **"Background" processing is just an un-awaited async call**, not a real
  queue. This app runs as a single long-lived local Node process
  (`next dev` / `next start`), so that's enough for a demo; the `/add` page
  polls `GET /api/links` to reflect status changes.
- **Failed links don't block anything.** They still show up in `/timeline`
  with a `Failed` badge and a retry button, and (along with any link whose
  categorization call failed) get grouped into a virtual `Uncategorized`
  topic rather than a real topic table row.

## Non-goals

- No auth, no multi-user
- No manual topic editing/reassignment (so chat history staying tied to the
  topic string, not a stable id, isn't a concern yet)
- No editing/deleting individual past chat messages — only clearing a
  topic's entire history at once
