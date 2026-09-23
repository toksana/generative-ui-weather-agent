import { CapabilityCard } from '@/components/weather/capability-card';
import { ComparisonWidget } from '@/components/weather/comparison-widget';
import { DisambiguationCard } from '@/components/weather/disambiguation-card';
import { HourlyChartWidget } from '@/components/weather/hourly-chart-widget';
import { SingleCityCard } from '@/components/weather/single-city-card';
import { WeatherFallbackCard } from '@/components/weather/weather-fallback-card';
import type { MessagePart as MessagePartType } from '@/lib/chat/part-key';
import { assertNever } from '@/lib/utils';

interface MessagePartProps {
  part: MessagePartType;
  onSuggestedPrompt: (prompt: string) => void;
}

export function MessagePart({ part, onSuggestedPrompt }: MessagePartProps) {
  switch (part.type) {
    case 'text':
      return <p className="whitespace-pre-wrap text-base text-foreground md:text-lg">{part.text}</p>;

    case 'tool-showCurrentWeather': {
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        return <SingleCityCard.Frame city={part.input?.city} />;
      }
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      if (part.state !== 'output-available') return null;

      const stream = part.output;
      switch (stream.status) {
        case 'resolving':
          return <SingleCityCard.Frame city={stream.query} />;
        case 'located':
          return <SingleCityCard.Frame location={stream.location} pending />;
        case 'ready':
          return <SingleCityCard {...stream} />;
        case 'failed':
          return <WeatherFallbackCard {...stream} />;
        case 'ambiguous':
          return (
            <DisambiguationCard
              query={stream.query}
              candidates={stream.candidates}
              onSelectCandidate={onSuggestedPrompt}
            />
          );
        default:
          return assertNever(stream);
      }
    }

    case 'tool-compareCities': {
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      const cities =
        part.state === 'input-streaming'
          ? (part.input?.cities ?? []).filter((city): city is string => typeof city === 'string' && city.length > 0)
          : part.input.cities;
      const update = part.state === 'output-available' ? part.output : undefined;
      return <ComparisonWidget cities={cities} update={update} onSuggestedPrompt={onSuggestedPrompt} />;
    }

    case 'tool-showHourlyForecast': {
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        return <HourlyChartWidget.Frame city={part.input?.city} />;
      }
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      if (part.state !== 'output-available') return null;

      const stream = part.output;
      switch (stream.status) {
        case 'resolving':
          return <HourlyChartWidget.Frame city={stream.query} />;
        case 'located':
          return <HourlyChartWidget.Frame location={stream.location} />;
        case 'ready':
          return <HourlyChartWidget {...stream} />;
        case 'failed':
          return <WeatherFallbackCard {...stream} />;
        case 'ambiguous':
          return (
            <DisambiguationCard
              query={stream.query}
              candidates={stream.candidates}
              onSelectCandidate={onSuggestedPrompt}
            />
          );
        default:
          return assertNever(stream);
      }
    }

    case 'tool-explainCapability': {
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      if (part.state !== 'output-available') return null;
      return <CapabilityCard {...part.output} onSelectPrompt={onSuggestedPrompt} />;
    }

    default:
      return null;
  }
}
