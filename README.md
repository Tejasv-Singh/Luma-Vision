# Luma Vision — Badminton Match Analyzer

A production-ready React + TypeScript frontend for a BWF match-analysis platform. Upload broadcast
footage, and the app presents the output of four ML modules — shot classification, court-coverage
mapping, TrackNetV3 shuttle tracking and pose estimation — as a single reviewable report.

The UI ships with a complete mock backend, so it runs standalone with zero services.

> **Using the app rather than building it?** See the [User Guide](./USER_GUIDE.md) — how to upload a
> match, read each analysis tab, review video, export reports and compare matches.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional — defaults work as-is
npm run dev                    # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Types only, no emit |

Requires Node 18+ (developed on Node 22).

---

## Architecture

```
src/
├── api/
│   ├── client.ts           Axios instance + error normalisation
│   ├── analysisService.ts  THE seam: mock vs. real HTTP, chosen once by env
│   ├── mockServer.ts       In-browser backend (upload, job pipeline, persistence)
│   └── mockData.ts         Seeded generators for every payload
├── components/
│   ├── ui/                 Card, MetricCard, ProgressBar, ScoreRing, Tabs,
│   │                       DataTable, Collapsible, Toast, Skeleton, Tooltip,
│   │                       VirtualList, ErrorBoundary
│   ├── charts/             Recharts visualisations (one lazy chunk)
│   ├── upload/             Dropzone + live upload/analysis queue
│   ├── tabs/               The five analysis tabs
│   ├── video/              Player, frame stepping, timeline scrubber, overlay
│   └── layout/             App shell, nav, display settings
├── hooks/                  useAnalysis, useUploads, useDebounce, useLocalStorage
├── pages/                  Dashboard, History, Compare, Player profile
├── context/                Display settings (brightness/contrast/motion)
├── types/                  The full domain contract
└── utils/                  format, viz tokens, cache, pdf, config
```

### The API seam

Components never call HTTP directly — they call `analysisService`. That module decides once, from
`VITE_USE_MOCK_API`, whether a call is served by `mockServer` or by axios. **Switching to a real
backend requires no component changes.**

| Endpoint | Method | Service call |
| --- | --- | --- |
| `/api/upload` | POST | `upload(file, { onProgress, signal })` |
| `/api/analysis/:id` | GET | `getAnalysis(id)` |
| `/api/analysis/:id/shots` | GET | `getShots(id)` |
| `/api/analysis/:id/coverage` | GET | `getCoverage(id)` |
| `/api/analysis/:id/shuttle` | GET | `getShuttle(id)` |
| `/api/analysis/:id/pose` | GET | `getPose(id)` |
| `/api/analysis/:id/status` | GET | `getJob(id)` — polled while running |
| `/api/analyses` | GET | `listAnalyses()` |
| `/api/analysis/:id` | DELETE | `deleteAnalysis(id)` |
| `/api/analysis/:id/cancel` | POST | `cancelAnalysis(id)` |
| `/api/analysis/:id/retry` | POST | `retryAnalysis(id)` |

To point at a real service: set `VITE_USE_MOCK_API=false` and either `VITE_API_BASE_URL` to the
service origin, or leave it as `/api` and set `VITE_PROXY_TARGET` so the Vite dev proxy forwards.

The expected JSON shapes are exactly the exported interfaces in `src/types/index.ts` — that file is
the contract between this frontend and the backend.

### Mock backend

`mockServer.ts` is a genuine simulation, not a pile of fixtures:

- **Uploads** report byte-wise progress and are abortable via `AbortController`.
- **Jobs** move through the real status machine (`queued → analyzing → complete`), advancing through
  named pipeline stages, and are pollable, cancellable and retryable.
- **Persistence** survives reloads via `localStorage`. Only *IDs* are stored — payloads are
  regenerated from a seeded PRNG keyed on the video ID, so storage stays tiny and a given match
  always produces identical numbers across reloads, tabs and the compare view.
- Video blobs are deliberately not persisted (object URLs die with the page), so a restored analysis
  keeps its statistics but degrades the player to a timeline-only view rather than showing a broken
  `<video>`.

Tuning knobs: `VITE_MOCK_LATENCY`, `VITE_MOCK_ANALYSIS_SECONDS`.

---

## Features

**Upload** — drag-and-drop or browse, multi-file, type + size validation before anything touches the
network, per-file progress, cancel and retry, and a live queue that follows each job to completion.

**Five analysis tabs**

1. **Overview** — four headline metric cards with progress tracks, a 12-tile statistics grid,
   generated performance summary, and video/match metadata.
2. **Shot Analysis** — six shot-type cards, a distribution chart with click-to-highlight, most-used
   and most-effective callouts, a consistency score with coaching tips, and a sortable table.
3. **Court Coverage** — an interactive 16-zone heatmap with hover/keyboard inspection, SVG movement
   trajectory and base-position marker over court markings, front/mid/back usage bands, and a
   zone-by-zone table.
4. **Shuttle Data** — peak/average velocity, flight time, net clearance, spin, landing accuracy, a
   velocity-over-time line chart with the match average marked, and TrackNetV3 detection confidence
   with tracked/missed frame counts.
5. **Player Pose** — forehand/backhand split with accuracy, stance stability, follow-through quality,
   reaction and recovery timing, keypoint confidence and footwork rating.

**Beyond the tabs** — PDF export, side-by-side comparison of up to three matches with per-metric
winner highlighting, video review with frame-by-frame stepping and an event overlay, a timeline
scrubber marking every shot and point, searchable/sortable match history with delete, and an
aggregate player profile.

**Display settings** — the app is dark-only by design; rather than a light theme it offers
brightness (dim/balanced/bright), contrast (soft/standard/high) and a reduce-motion toggle, since a
broadcast truck and an office are very different lighting environments. Preferences persist.

---

## Design system

Dark navy ground (`#0a0e27` / `#0f1229` / `#141a3a`) with a gold-amber accent (`#ffc107` → `#ff9800`)
for CTAs, highlights and single-series data. Tokens live in `tailwind.config.js`; component classes
(`.panel`, `.btn-primary`, `.stat-label`, `.field`) in `src/index.css`.

### Chart colour is validated, not eyeballed

`src/utils/viz.ts` holds every chart colour, and each set was run through a colourblind-safety
validator against this app's actual panel surface (`#141a3a`). The recorded results:

| Set | Use | Result |
| --- | --- | --- |
| `SERIES` (3 slots) | Multi-series charts (compare, stroke split) | **PASS** all-pairs — worst normal-vision ΔE 20.9, worst CVD ΔE 9.4, all ≥3:1 contrast |
| `HEAT_RAMP` (6 steps) | Court-zone heatmap | **PASS** ordinal — monotone lightness, ΔL ≥0.06, light end 2.18:1 vs surface, hue spread 4° |

Two rules the module exists to enforce:

1. **Brand gold is a UI accent and a single-series colour only.** Its lightness (L 0.844) sits
   outside the dark-mode categorical band, so it is never slot 1 of a multi-series palette. The
   original six-colour shot palette failed validation (adjacent gold/orange at ΔE 9.7, below the 15
   floor) and was replaced by single-hue-plus-emphasis.
2. **Colour follows the entity, never its rank** — series colours index by stable ID, so filtering
   or re-sorting never repaints the survivors.

Also applied throughout: one y-axis per chart (never dual-axis), sequential = one hue light→dark with
a scale legend, thin marks with 4px rounded data-ends, solid hairline gridlines, selective direct
labels rather than a number on every point, a legend whenever two or more series are on screen, and
a table view alongside every chart so no reading depends on colour alone. Hero and stat-tile figures
use proportional figures; `tabular-nums` is reserved for table rows and axis ticks.

---

## Performance

- **Lazy chart chunk** — Recharts and its d3 dependencies (~180 kB gz) load only when a chart first
  renders; all charts share one chunk, so the second is free.
- **Lazy routes** — history, compare and profile are split out of the initial bundle.
- **Lazy PDF** — jsPDF is imported only when Export is clicked.
- **Request cache with de-duplication** (`utils/cache.ts`) — TTL cache plus in-flight collapsing, so
  five tabs mounting at once produce one request, and failures are never cached.
- **Debounced** file intake and history search.
- **Virtualised list** (`ui/VirtualList.tsx`) for long event lists, with a rAF-coalesced scroll
  handler.
- **Manual chunks** splitting react / charts / pdf vendors.

## Error handling & edge cases

Normalised API errors (network, timeout, 404, 413, cancellation) with human-readable messages;
`ErrorBoundary` around each tab and the router so one bad payload can't take down the dashboard;
toast notifications with retry actions; optimistic delete that rolls back on failure; abort of all
in-flight uploads on unmount; stale-response guarding via request tickets; `localStorage` access
wrapped for private-browsing contexts; graceful degradation when a video source is unavailable;
and empty/loading/error states for every async surface.

## Accessibility

WAI-ARIA tab pattern with roving focus and arrow-key navigation, skip-to-content link, keyboard-
reachable heatmap zones, `aria-live` toast region, labelled progress bars and form controls, visible
focus rings throughout, and `prefers-reduced-motion` support plus an explicit in-app toggle.

---

## Environment variables

See `.env.example`. All are optional — defaults produce a working offline demo.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Analysis API base URL |
| `VITE_PROXY_TARGET` | `http://localhost:8000` | Dev-proxy target for `/api` |
| `VITE_USE_MOCK_API` | `true` | `false` switches to real HTTP calls |
| `VITE_MOCK_LATENCY` | `650` | Simulated response latency (ms) |
| `VITE_MOCK_ANALYSIS_SECONDS` | `12` | Simulated pipeline duration |
| `VITE_MAX_UPLOAD_MB` | `2048` | Max accepted upload size |
| `VITE_API_TIMEOUT` | `30000` | Request timeout (ms); uploads are exempt |

---

## Extending

**A new analysis module** — add its interface to `src/types/index.ts`, a generator in `mockData.ts`,
a getter in `analysisService.ts`, then a tab component and an entry in the `TABS` array in
`DashboardPage.tsx`.

**A new chart** — add it to `components/charts/Charts.tsx` and export a lazy wrapper from
`charts/index.tsx` so it joins the existing chunk. Draw colours from `utils/viz.ts`; if you add a
colour, re-run the validator against `#141a3a` before shipping it.

**Real authentication** — add an axios request interceptor in `api/client.ts`; nothing else needs to
change.

## Notes

PDF export composes the document from real text via jsPDF rather than rasterising the DOM, so output
stays selectable, searchable and small, and doesn't depend on a screenshot library reproducing the
dark theme's gradients and backdrop filters. Figures throughout are model estimates and should be
reviewed against video before informing coaching decisions.
