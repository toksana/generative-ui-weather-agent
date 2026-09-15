import type { InferUITools, UIMessage } from 'ai';

import { compareCities } from './compare-cities';
import { explainCapability } from './explain-capability';
import { showCurrentWeather } from './show-current-weather';
import { showHourlyForecast } from './show-hourly-forecast';

export const weatherTools = {
  showCurrentWeather,
  compareCities,
  showHourlyForecast,
  explainCapability,
};

export type WeatherTools = InferUITools<typeof weatherTools>;
export type ChatMessage = UIMessage<never, never, WeatherTools>;
