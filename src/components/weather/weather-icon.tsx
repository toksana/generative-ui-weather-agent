import type { WeatherIcon as WeatherIconName } from '@/lib/weather/wmo';

const ICON_GLYPH: Record<WeatherIconName, string> = {
  clear: '☀️',
  'partly-cloudy': '⛅',
  cloudy: '☁️',
  fog: '🌫️',
  drizzle: '🌦️',
  rain: '🌧️',
  'freezing-rain': '🧊',
  snow: '❄️',
  showers: '🌦️',
  'snow-showers': '🌨️',
  thunderstorm: '⛈️',
  unknown: '❓',
};

export function WeatherIcon({ icon, className }: { icon: WeatherIconName; className?: string }) {
  return (
    <span role="img" aria-label={icon.replace('-', ' ')} className={className}>
      {ICON_GLYPH[icon]}
    </span>
  );
}
