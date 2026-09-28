# Primo — mobile prototype

A mobile-first, installable web app (PWA) for daily tasks and focus sessions. Vanilla HTML/CSS/JS, no build step, data stays on-device (`localStorage`).

- **Today** – add / complete / delete tasks, daily progress ring
- **Focus** – 15/25/45 min timer tied to a task; survives backgrounding and reloads
- **Stats** – streak, totals, 7-day chart
- Light/dark theme, safe-area aware, works offline via a service worker

## Run

```sh
python3 -m http.server 8000   # or any static server
```

Open http://localhost:8000 on your phone (same network) or in browser devtools' device mode.
On iOS/Android use *Add to Home Screen* to install (service worker needs HTTPS or localhost).
