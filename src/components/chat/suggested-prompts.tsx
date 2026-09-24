import { Chip } from '@/components/ui/chip';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

const SUGGESTED_PROMPTS = [
  "What's the weather like in Tokyo right now?",
  'Compare the weather in London, Paris, and Berlin',
  'Will it rain in Seattle in the next few hours?',
  "What's the air quality in Denver?",
];

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <Chip key={prompt} type="button" onClick={() => onSelectPrompt(prompt)}>
          {prompt}
        </Chip>
      ))}
    </div>
  );
}
