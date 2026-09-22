import { Card, CardContent } from '@/components/ui/card';
import type { Location } from '@/lib/weather/schemas';

interface AmbiguousNoticeProps {
  query: string;
  candidates: Location[];
}

export function AmbiguousNotice({ query, candidates }: AmbiguousNoticeProps) {
  return (
    <Card className="w-full max-w-md">
      <CardContent>
        <p className="text-base text-foreground md:text-lg">
          Which {query}?{' '}
          {candidates.map((candidate) => `${candidate.name}, ${candidate.country}`).join(' · ')}
        </p>
      </CardContent>
    </Card>
  );
}
