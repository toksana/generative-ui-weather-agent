import { describeWeatherCode } from './wmo';
import type { CurrentConditions, HourlyForecast } from './schemas';

/**
 * How far apart temperature and apparent temperature must be before it's
 * worth calling out. Below this, "feels like" noise isn't a useful insight.
 */
const FEELS_LIKE_GAP_THRESHOLD = 5;

/**
 * Precipitation probability (%) at or above which an upcoming-rain note
 * is worth surfacing.
 */
const RAIN_PROBABILITY_THRESHOLD = 60;

function feelsLikeNote(conditions: CurrentConditions): string | null {
  const gap = conditions.apparentTemperature - conditions.temperature;
  if (Math.abs(gap) < FEELS_LIKE_GAP_THRESHOLD) return null;

  const direction = gap < 0 ? 'colder' : 'warmer';
  return `Feels ${Math.round(Math.abs(gap))}° ${direction} than the actual temperature.`;
}

function upcomingRainNote(hourly: HourlyForecast): string | null {
  const peakIndex = hourly.precipitationProbability.reduce(
    (best, value, index) => (value > hourly.precipitationProbability[best] ? index : best),
    0,
  );
  const peakProbability = hourly.precipitationProbability[peakIndex];
  if (peakProbability < RAIN_PROBABILITY_THRESHOLD) return null;

  const time = hourly.time[peakIndex]?.split('T')[1] ?? 'later';
  return `Rain likely around ${time} (${Math.round(peakProbability)}% chance).`;
}

function conditionsSummary(conditions: CurrentConditions): string {
  const { label } = describeWeatherCode(conditions.weatherCode);
  return `${label} right now.`;
}

/**
 * Builds a single deterministic, human-readable insight from weather data.
 * Deliberately not LLM-generated: it's free, instant, and can never
 * hallucinate a fact the underlying data doesn't support. Notes are
 * prioritized — a genuine feels-like gap matters more than distant rain,
 * which in turn beats a generic conditions summary.
 */
export function buildInsight(input: {
  conditions: CurrentConditions;
  hourly: HourlyForecast;
}): string {
  const { conditions, hourly } = input;

  return (
    feelsLikeNote(conditions) ?? upcomingRainNote(hourly) ?? conditionsSummary(conditions)
  );
}
