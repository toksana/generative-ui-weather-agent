/**
 * WMO weather interpretation codes, as used by Open-Meteo's `weather_code` field.
 * https://open-meteo.com/en/docs — "WMO Weather interpretation codes (WW)"
 */

export type WeatherIcon =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'freezing-rain'
  | 'snow'
  | 'showers'
  | 'snow-showers'
  | 'thunderstorm'
  | 'unknown';

export type WeatherSeverity = 'calm' | 'mild' | 'notable' | 'severe';

export interface WeatherCondition {
  code: number;
  label: string;
  icon: WeatherIcon;
  severity: WeatherSeverity;
}

const WEATHER_CODE_TABLE: Record<number, Omit<WeatherCondition, 'code'>> = {
  0: { label: 'Clear sky', icon: 'clear', severity: 'calm' },
  1: { label: 'Mainly clear', icon: 'clear', severity: 'calm' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy', severity: 'calm' },
  3: { label: 'Overcast', icon: 'cloudy', severity: 'calm' },
  45: { label: 'Fog', icon: 'fog', severity: 'mild' },
  48: { label: 'Depositing rime fog', icon: 'fog', severity: 'mild' },
  51: { label: 'Light drizzle', icon: 'drizzle', severity: 'mild' },
  53: { label: 'Moderate drizzle', icon: 'drizzle', severity: 'mild' },
  55: { label: 'Dense drizzle', icon: 'drizzle', severity: 'mild' },
  56: { label: 'Light freezing drizzle', icon: 'freezing-rain', severity: 'mild' },
  57: { label: 'Dense freezing drizzle', icon: 'freezing-rain', severity: 'mild' },
  61: { label: 'Slight rain', icon: 'rain', severity: 'notable' },
  63: { label: 'Moderate rain', icon: 'rain', severity: 'notable' },
  65: { label: 'Heavy rain', icon: 'rain', severity: 'severe' },
  66: { label: 'Light freezing rain', icon: 'freezing-rain', severity: 'notable' },
  67: { label: 'Heavy freezing rain', icon: 'freezing-rain', severity: 'severe' },
  71: { label: 'Slight snow fall', icon: 'snow', severity: 'notable' },
  73: { label: 'Moderate snow fall', icon: 'snow', severity: 'notable' },
  75: { label: 'Heavy snow fall', icon: 'snow', severity: 'severe' },
  77: { label: 'Snow grains', icon: 'snow', severity: 'notable' },
  80: { label: 'Slight rain showers', icon: 'showers', severity: 'notable' },
  81: { label: 'Moderate rain showers', icon: 'showers', severity: 'notable' },
  82: { label: 'Violent rain showers', icon: 'showers', severity: 'severe' },
  85: { label: 'Slight snow showers', icon: 'snow-showers', severity: 'notable' },
  86: { label: 'Heavy snow showers', icon: 'snow-showers', severity: 'severe' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm', severity: 'severe' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunderstorm', severity: 'severe' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunderstorm', severity: 'severe' },
};

export const KNOWN_WEATHER_CODES: readonly number[] = Object.keys(WEATHER_CODE_TABLE)
  .map(Number)
  .sort((a, b) => a - b);

const UNKNOWN_CONDITION: Omit<WeatherCondition, 'code'> = {
  label: 'Unknown conditions',
  icon: 'unknown',
  severity: 'calm',
};

/**
 * Maps a WMO `weather_code` to a UI-friendly condition. Never throws — an
 * unrecognized or malformed code (out of range, non-integer, NaN) falls back
 * to a neutral "unknown" condition so a widget can always render something.
 */
export function describeWeatherCode(code: number): WeatherCondition {
  const entry = Number.isInteger(code) ? WEATHER_CODE_TABLE[code] : undefined;
  return { code, ...(entry ?? UNKNOWN_CONDITION) };
}
