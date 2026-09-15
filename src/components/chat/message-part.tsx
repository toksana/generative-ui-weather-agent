import { Card, CardContent } from '@/components/ui/card';
import { SingleCityCard } from '@/components/weather/single-city-card';
import { WeatherFallbackCard } from '@/components/weather/weather-fallback-card';
import type { MessagePart } from '@/lib/chat/part-key';
import { assertNever } from '@/lib/utils';

export function MessagePart({ part }: { part: MessagePart }) {
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
          // TODO: replace with DisambiguationCard (clickable chips) once built.
          return (
            <Card className="w-full max-w-md">
              <CardContent>
                <p className="text-base text-foreground md:text-lg">
                  Which {stream.query}?{' '}
                  {stream.candidates.map((candidate) => `${candidate.name}, ${candidate.country}`).join(' · ')}
                </p>
              </CardContent>
            </Card>
          );
        default:
          return assertNever(stream);
      }
    }

    default:
      return null;
  }
}
