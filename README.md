# Adaptive Weather Agent

A Generative UI weather assistant: you ask a question in plain language, Claude picks a tool, the server fetches real weather data, and a purpose-built React widget streams into the conversation — progressively, not skeleton-then-swap.

Tool calling, structured output validation, streaming UI, rate limiting, observability, and a graded eval suite. Full architecture and phase-by-phase plan: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Status

🚧 Under active development. Current state:

- [x] Project scaffold (Next.js 16, TypeScript, Tailwind v4, Vitest)
- [x] `wmo.ts` — WMO weather code → UI condition mapping
- [ ] `insight.ts` — deterministic weather insight text
- [ ] `client.ts` — Open-Meteo geocoding + forecast client
- [ ] Zod schemas for tool inputs/outputs
- [ ] Weather tools + chat route
- [ ] Chat UI + widgets (single city, comparison, hourly chart)
- [ ] Rate limiting + budget guards
- [ ] Motion, mobile layout, error fallbacks
- [ ] Redis caching, Langfuse tracing
- [ ] `/evals` tool-choice and schema-accuracy suite

## Why these choices

- **AI SDK UI, this project streams via `streamText` + `useChat`, with typed tool parts (`tool-showCurrentWeather`, etc.) driving which widget renders.
- **Claude Haiku 4.5 by default, Sonnet 5 one env var away.** Tool routing across a handful of well-described tools is an easy classification task; the `/evals` suite is the arbiter — if tool-choice accuracy drops below 95% on the graded dataset, the model escalates to Sonnet.
- **One tool per widget, and the model never emits a weather number.** Every tool calls a real weather API server-side and returns Zod-validated props; the model only picks the tool and extracts arguments. This removes hallucinated data as a failure mode entirely.
- **No vector database.** There's no corpus here — weather is live data fetched via tool calls, not retrieved from documents. Adding embeddings/RAG would be decoration, not architecture.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # add your ANTHROPIC_API_KEY
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Only `ANTHROPIC_API_KEY` is required to run locally — Upstash Redis/rate-limiting and Langfuse tracing are optional and fall back gracefully when unset.

## Scripts

| Command | Purpose |
|---|---|
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run the Vitest suite once |
| `pnpm test:watch` | Run Vitest in watch mode |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm eval` | Run the tool-choice / schema-accuracy eval suite (Phase 3) |

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Vercel AI SDK v7 (`@ai-sdk/anthropic`, `@ai-sdk/react`) · Zod v4 · Recharts · Motion · Upstash Redis/Ratelimit · Langfuse · Vitest + Testing Library + Faker.
