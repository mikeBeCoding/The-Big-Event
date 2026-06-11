# The Big Event

A Comcast community-event sales training game: a React + Vite frontend talks to an
Express backend that drives resident personas and AI coaching via the Anthropic API.

## Project layout

```
The Big Event/            <- repo root (run commands from here)
├── server/               <- Express backend (port 4000)
└── The Big Event/        <- React + Vite frontend (port 5173)
```

> Note the nested `The Big Event/` folder — that's the frontend. The app has **two
> parts** that both need to be running.

## Setup (one time)

```bash
# from the repo root
npm install                              # installs root tooling (concurrently)
npm --prefix "The Big Event" install     # frontend deps
npm --prefix server install              # backend deps
```

Optional: add an Anthropic API key so the resident and coaching responses are
AI-generated. Without it the server falls back to scripted keyword responses and
still runs.

```bash
# server/.env
ANTHROPIC_API_KEY=sk-ant-...
PORT=4000
```

## Run

From the **repo root**, one command starts both the backend and the frontend:

```bash
npm run dev
```

- Backend → http://localhost:4000
- Frontend → http://localhost:5173 ← open this in your browser

**Wait for both "ready" lines before opening the browser.** Vite takes ~5s to warm
up on a cold start, and a page opened before the server is listening will show a
connection error that clears once both are up.

### Running them separately

If you prefer two terminals:

```bash
# terminal 1
npm run dev:server

# terminal 2
npm run dev:web
```

## Troubleshooting

- **Page can't reach the server / fetch errors:** make sure the backend printed
  `Server listening on 4000`. The frontend calls `http://localhost:4000` by default
  (override with `VITE_SERVER_URL`).
- **Port already in use:** an old `node`/`vite` process is still running. Kill it
  with `pkill -f "node index.js"` and `pkill -f vite`, then retry.
- **`npm run dev` does nothing:** you're probably in the wrong folder. Run it from
  the repo root (the folder that contains both `server/` and `The Big Event/`).
