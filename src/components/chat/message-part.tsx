import ReactMarkdown from 'react-markdown';

import { CapabilityCard } from '@/components/weather/capability-card';
import { ComparisonWidget } from '@/components/weather/comparison-widget';
import { HourlyChartWidget } from '@/components/weather/hourly-chart-widget';
import { SingleCityCard } from '@/components/weather/single-city-card';
import { WeatherFallbackCard } from '@/components/weather/weather-fallback-card';
import type { MessagePart as MessagePartType } from '@/lib/chat/part-key';

interface MessagePartProps {
  part: MessagePartType;
  onSuggestedPrompt: (prompt: string) => void;
}

export function MessagePart({ part, onSuggestedPrompt }: MessagePartProps) {
  switch (part.type) {
    case 'text':
      return (
        <div className="text-base text-foreground md:text-lg [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p:not(:last-child)]:mb-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          <ReactMarkdown>{part.text}</ReactMarkdown>
        </div>
      );

    case 'tool-showCurrentWeather': {
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        return <SingleCityCard.Frame city={part.input?.city} />;
      }
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      if (part.state !== 'output-available') return null;

      return (
        <SingleCityCard.Stream toolCallId={part.toolCallId} stream={part.output} onSuggestedPrompt={onSuggestedPrompt} />
      );
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
      return (
        <ComparisonWidget
          toolCallId={part.toolCallId}
          cities={cities}
          update={update}
          onSuggestedPrompt={onSuggestedPrompt}
        />
      );
    }

    case 'tool-showHourlyForecast': {
      if (part.state === 'input-streaming' || part.state === 'input-available') {
        return <HourlyChartWidget.Frame city={part.input?.city} />;
      }
      if (part.state === 'output-error') {
        return <WeatherFallbackCard reason="upstream_error" />;
      }
      if (part.state !== 'output-available') return null;

      return (
        <HourlyChartWidget.Stream
          toolCallId={part.toolCallId}
          stream={part.output}
          onSuggestedPrompt={onSuggestedPrompt}
        />
      );
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
