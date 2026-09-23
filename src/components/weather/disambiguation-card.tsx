import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import type { Location } from '@/lib/weather/schemas';

interface DisambiguationCardProps {
  query: string;
  candidates: Location[];
  onSelectCandidate?: (prompt: string) => void;
}

function candidateLabel(candidate: Location): string {
  return [candidate.name, candidate.admin1, candidate.country].filter(Boolean).join(', ');
}

export function DisambiguationCard({ query, candidates, onSelectCandidate }: DisambiguationCardProps) {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Which {query}?</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {candidates.map((candidate) => {
          const label = candidateLabel(candidate);
          return (
            <Chip key={label} type="button" onClick={() => onSelectCandidate?.(label)}>
              {label}
            </Chip>
          );
        })}
      </CardContent>
    </Card>
  );
}
