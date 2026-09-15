import { tool } from 'ai';

import { showCurrentWeatherInputSchema } from '@/lib/weather/schemas';

import { resolveCurrentWeather } from './resolve-current-weather';

export const showCurrentWeather = tool({
  description:
    "Show current weather conditions for a single named city, including a short human-readable insight. Use this for questions about one place's weather right now.",
  inputSchema: showCurrentWeatherInputSchema,
  execute: ({ city }) => resolveCurrentWeather(city),
});
