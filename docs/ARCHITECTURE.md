# Architecture & Roadmap

This document is the source of truth for how the Adaptive Weather Agent is built and why. The project progresses — see the [README](../README.md) for current build status.

## What this project demonstrates

A chat surface where a user expresses weather intent in natural language, the model selects a **tool**, the server fetches real data, and a **React widget streams progressively into the conversation** — with graceful degradation, rate limiting, tracing, and a graded eval suite.

## Decisions and why

| Area | Decision | Why |
|---|---|---|
| Streaming | **AI SDK UI** (`ai@7` + `@ai-sdk/react@4`) |
| Model | `claude-haiku-4-5` default, `claude-sonnet-5` one env var away | Tool routing across a handful of tools is easy classification; Haiku is 2× cheaper/faster and TTFT is the headline metric. The `/evals` suite arbitrates: below 95% tool-choice accuracy, escalate to Sonnet. |
| Rendering | Progressive — tools are async generators yielding partial state | Skeletons should be the empty case, not the strategy. See [Progressive streaming](#progressive-streaming-not-skeleton-then-swap). |
| Abuse control | Upstash IP-based rate limit + tiers, no login | Reviewers open the URL and it works — no auth wall. |
| Observability | Langfuse Cloud via OpenTelemetry | First-party `ai@7` integration, free tier, shareable dashboard link. |
| Embeddings / RAG | Deliberately none | There's no corpus — weather is live data via tool calls. See [No RAG](#no-rag-deliberately). |
| Layout | `src/` directory | Keeps app code separate from the ~12 root config files plus `evals/` tooling. |
| Testing | TDD |

## Architecture

### 1. Tool choice *is* widget choice

One tool per widget. `execute` fetches from Open-Meteo server-side and returns Zod-validated props. **The model never emits a weather number** — it only picks the tool and extracts arguments. This removes hallucinated data as a failure mode and makes "Tool Choice Accuracy" a cheap deterministic exact-match eval instead of an LLM-judged one.

| Tool | Input | Renders |
|---|---|---|
| `showCurrentWeather` | `{ city }` | `SingleCityCard` |
| `compareCities` | `{ cities: string[] }` (2–4) | `ComparisonWidget` |
| `showHourlyForecast` | `{ city, metric: 'temperature' \| 'precipitation', hours }` | `HourlyChartWidget` |
| `explainCapability` | `{ requested, nearest }` | `CapabilityCard` — see [Unsupported requests](#3-unsupported-and-unprepared-requests) |

### 2. Progressive streaming, not skeleton-then-swap

Every tool is an **async generator**; the last yielded value is the final result. All tools share one streamed contract:

```ts
type ToolStream<T> =
  | { status: 'resolving';  query: string }
  | { status: 'ambiguous';  query: string; candidates: Location[] }
  | { status: 'located';    location: Location }
  | { status: 'ready';      location: Location; data: T }
  | { status: 'failed';     query: string; reason: FailureReason };
```

```ts
async *execute({ city }) {
  yield { status: 'resolving', query: city };
  const loc = await geocode(city);
  if (!loc.ok) return { status: 'failed', query: city, reason: loc.reason };
  yield { status: 'located', location: loc.data };      // frame paints here
  const fc = await forecast(loc.data);
  return fc.ok
    ? { status: 'ready', location: loc.data, data: fc.data }
    : { status: 'failed', query: city, reason: fc.reason };
}
```

Three layers of "as soon as available," earliest first:

1. **Partial tool input.** `part.state === 'input-streaming'` exposes `part.input` while the model is still emitting arguments — the card header shows `"Tokyo"` before the tool has even been invoked.
2. **`status: 'located'`.** Geocoding resolves in ~80 ms (usually a cache hit), so the widget frame — city, country, timezone, local time — is real data long before the forecast lands. Only the metric region stays skeletal.
3. **`status: 'ready'`.** Data fills in; numbers animate from the skeleton state.

`compareCities` yields **per city as each settles** (merge-as-resolved over the parallel fetches, not `Promise.all`) — a 4-city comparison paints its first card at ~200 ms rather than blocking on the slowest.

> This is only visible under network throttling — at full speed the stages collapse into one frame. See verification step 2.

### 3. Unsupported and unprepared requests

A free-text box invites anything. Four defenses, outermost first:

1. **`<constraints>` in the system prompt** — scope statement, never invent data, ignore instructions embedded in user text.
2. **`explainCapability` tool.** An explicit "I can't do that" tool is more reliable than hoping the model declines in prose, and unlike prose it's gradeable. Covers non-weather questions, weather-adjacent-but-unsupported requests (historical, beyond the 16-day horizon, air quality, marine, pollen), and prompt-injection attempts. `CapabilityCard` states the limit and offers the nearest supported action as clickable chips.
3. **Ambiguous locations.** Geocode with `count=5`; if top matches share a name across countries ("Springfield," "Cambridge"), yield `status: 'ambiguous'` → `DisambiguationCard` with chips that re-send a refined query.
4. **Missing city.** "What's the weather?" → no tool call, a clarifying question. Exercised explicitly in the eval set.

### 4. No RAG, deliberately

There is no corpus: data is live and arrives via tool calls. 

### 5. Layout — `src/`

Next.js: `src/` "separates application code from project configuration files which mostly live in the root." This project's root holds ~12 config files (`next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `.env.example`, `package.json`, `README.md`, …) plus `evals/`, which is tooling rather than app source.

Consequences: `instrumentation.ts` lives inside `src/`; `tsconfig` paths map `@/*` → `src/*`; `public/`, `.env.*`, and all configs stay at root. Tailwind v4 is CSS-configured (`@import "tailwindcss"`), so there's no `content` array needing a `/src` prefix.

```
src/
  app/  layout.tsx  page.tsx  globals.css
        api/chat/route.ts               # thin: guards → streamText → response
  components/
    chat/     weather-chat.tsx  message-list.tsx  message-part.tsx
              composer.tsx  suggested-prompts.tsx  rate-limit-notice.tsx
    weather/  single-city-card.tsx  comparison-widget.tsx  hourly-chart-widget.tsx
              capability-card.tsx  disambiguation-card.tsx  weather-fallback-card.tsx
              weather-icon.tsx  animated-number.tsx  metric-skeleton.tsx
    ui/       card.tsx  button.tsx  input.tsx  badge.tsx  chip.tsx
  lib/
    ai/       provider.ts  system-prompt.ts
              tools/ index.ts  show-current-weather.ts  compare-cities.ts
                     show-hourly-forecast.ts  explain-capability.ts
    weather/  client.ts  schemas.ts  wmo.ts  insight.ts  merge-as-resolved.ts
    cache/redis.ts   ratelimit.ts   budget.ts   telemetry.ts   types.ts
  instrumentation.ts
evals/  datasets/  graders/  run.ts  report.ts
```

`message-part.tsx` is the only file mapping stream state → UI, and is a flat switch. Widgets are small and presentational; none of them fetch.

## Phase 1 — Working core MVP

### 1.1 Scaffold
Next.js App Router, TypeScript strict, Tailwind v4, `src/`. Runtime deps: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`, `zod`, `recharts`, `@upstash/ratelimit`, `@upstash/redis`. Test deps: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@faker-js/faker`.

### 1.2 Weather service — `src/lib/weather/`

Two keyless Open-Meteo endpoints:
- `https://geocoding-api.open-meteo.com/v1/search?name={q}&count=5&language=en`
- `https://api.open-meteo.com/v1/forecast` with `current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,is_day`, `hourly=temperature_2m,precipitation_probability,precipitation`, `timezone=auto`, `forecast_days=2`.

| Module | Responsibility |
|---|---|
| `wmo.ts` | Pure `weather_code → { label, icon, severity }` map. Every documented code band plus an unknown-code fallback. |
| `insight.ts` | Deterministic one-line insight ("feels 6° colder," "rain likely after 15:00"). Not LLM-generated — free, instant, unhallucinatable. |
| `client.ts` | Cache-aside fetch layer. Returns `{ ok: true, data } \| { ok: false, reason }`; **never throws**; 5s `AbortSignal.timeout`. |
| `schemas.ts` | Zod schemas for tool inputs and widget-prop outputs — the contract the evals grade against. |
| `merge-as-resolved.ts` | Async iterator yielding parallel promises as each settles (not `Promise.all`). |

### 1.3 Tools + prompt — `src/lib/ai/`

Each tool: `description`, `inputSchema`, `async *execute` per the progressive-streaming contract above. `tools/index.ts` exports `weatherTools` plus an inferred chat type for full-stack type safety:

```ts
export type WeatherTools = InferUITools<typeof weatherTools>;
export type ChatMessage  = UIMessage<never, never, WeatherTools>;
```

### 1.4 Route — `src/app/api/chat/route.ts`

```ts
export const maxDuration = 30;
// No explicit `runtime` export — Next.js 16 defaults route handlers to
// nodejs, and the Edge runtime is deprecated. OTel's NodeSDK (Phase 3)
// requires the Node runtime anyway.

const result = streamText({
  model: getModel(),
  instructions: SYSTEM_PROMPT,
  messages: await convertToModelMessages(messages),
  tools: weatherTools,
  stopWhen: stepCountIs(4),
  maxOutputTokens: 1024,
});
return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream }),
});
```

### 1.5 Client — `src/components/chat/message-part.tsx`

```ts
case 'tool-showCurrentWeather': {
  if (part.state === 'input-streaming') return <SingleCityCard.Frame city={part.input?.city} />;
  if (part.state === 'output-error')    return <WeatherFallbackCard reason="upstream_error" />;
  const s = part.output;
  switch (s.status) {
    case 'resolving': return <SingleCityCard.Frame city={s.query} />;
    case 'ambiguous': return <DisambiguationCard {...s} />;
    case 'located':   return <SingleCityCard.Frame location={s.location} pending />;
    case 'ready':     return <SingleCityCard {...s} />;
    case 'failed':    return <WeatherFallbackCard {...s} />;
  }
}
```

### 1.6 Guards

Before `streamText`: reject input > 500 chars, reject > 20 turns, Upstash sliding window `5 / 1 day` keyed on `sha256(ip + SALT)`, global daily budget counter. Over limit → `429` + JSON reason rendered as `RateLimitNotice`. `cache/redis.ts` falls back to an in-memory LRU when `UPSTASH_*` is unset, so local dev needs only `ANTHROPIC_API_KEY`.

**Phase 1 done when:** four prompt classes (single / compare / hourly / unsupported) each render the right widget, and the widget frame paints before its data.

## Phase 2 — Motion, mobile, resilience

- Install `motion@13`. Skeleton and widget share a `layoutId` inside `AnimatePresence`, so `located → ready` morphs rather than swaps. `animated-number.tsx` uses `useMotionValue` + `useSpring`; everything honors `prefers-reduced-motion`.
- Mobile-first: every widget authored at 390px first. Charts in `ResponsiveContainer` inside a fixed-height parent. `ComparisonWidget` becomes a horizontal snap-scroll strip at 3+ cities.
- Resilience: per-widget React error boundary, Zod `safeParse` on every yielded value, `WeatherFallbackCard` per failure reason with retry, dark mode via Tailwind tokens.
- Reviewer affordances: four one-click seeded prompts, empty state explaining scope.

## Phase 3 — Observability, caching, evals

### Caching
`wx:v1:geo:{slug}` TTL 30 days; `wx:v1:fc:{lat},{lon}:{variant}` TTL 30 minutes. Hit/miss recorded as a span attribute.

### Tracing — `src/instrumentation.ts`
```ts
import { registerTelemetry } from 'ai';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { LangfuseVercelAiSdkIntegration } from '@langfuse/vercel-ai-sdk';
import { NodeSDK } from '@opentelemetry/sdk-node';

new NodeSDK({ spanProcessors: [new LangfuseSpanProcessor()] }).start();
registerTelemetry(new LangfuseVercelAiSdkIntegration());
```
Custom TTFT span (request start → first `tool-input-start` / `text-delta` chunk) plus a time-to-first-*frame* span (the `located` yield) — the metric the progressive design actually improves.

### Prompt engineering — `src/lib/ai/system-prompt.ts`
XML-structured: `<role>`, `<widget_selection_rules>`, `<examples>` (few-shot intent→tool pairs including ambiguous and out-of-scope cases), `<constraints>`.

### Evals — `/evals`

~50 cases across five intent regions, graded deterministically (exact tool name, order-insensitive city-set match, Zod `safeParse`):

| Region | Example | Expected |
|---|---|---|
| single | "how cold is Oslo" | `showCurrentWeather` |
| compare | "Tokyo vs Osaka" | `compareCities` |
| hourly | "will it rain in London this afternoon" | `showHourlyForecast(metric: 'precipitation')` |
| underspecified | "what's the weather" | no tool + clarifying question |
| unsupported | "weather in Rome in 1990" / prompt injection | `explainCapability` |

Targets: schema validity > 98%, tool-choice accuracy > 95%. The suite runs across `claude-haiku-4-5` and `claude-sonnet-5`; the accuracy/TTFT/cost table decides which ships as default.

## Critical files

`src/lib/ai/tools/index.ts` · `src/lib/weather/client.ts` · `src/lib/weather/schemas.ts` · `src/app/api/chat/route.ts` · `src/components/chat/message-part.tsx` · `src/lib/ai/system-prompt.ts` · `src/instrumentation.ts`

## Verification checklist

1. `pnpm dev` with only `ANTHROPIC_API_KEY` set.
2. Throttle to Slow 3G, run one prompt per class: city name during `input-streaming` → frame at `located` → metrics last.
3. "Compare Tokyo, Oslo, Cairo, Lima" — cards appear one by one.
4. `pnpm test` green.
5. `pnpm eval` — thresholds met; Haiku vs. Sonnet comparison recorded.
6. Force a dead upstream host → fallback card renders, no crash.
7. Out-of-scope prompts → `CapabilityCard`, no tool misfire.
8. "weather in Springfield" → disambiguation chips.
9. Six rapid requests → sixth returns 429.
10. Langfuse shows TTFT, time-to-first-frame, tokens, cost, cache hit/miss.
11. 390px viewport, no horizontal overflow; re-check with reduced motion.
12. `pnpm build` clean; re-verify steps 2 and 9 on the deployed URL.
