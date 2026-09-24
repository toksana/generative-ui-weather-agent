import { Info } from 'lucide-react';

import { Chip } from '@/components/ui/chip';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SuggestedPromptsProps {
  onSelectPrompt: (prompt: string) => void;
}

interface SuggestedPrompt {
  prompt: string;
  outOfScope?: boolean;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { prompt: "What's the weather like in Tokyo right now?" },
  { prompt: 'Compare the weather in London, Paris, and Berlin' },
  { prompt: 'Will it rain in Seattle in the next few hours?' },
  { prompt: "What's the air quality in Denver?", outOfScope: true },
];

const OUT_OF_SCOPE_HINT = "Not supported — demonstrates the assistant's error handling";

export function SuggestedPrompts({ onSelectPrompt }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2 py-4">
      {SUGGESTED_PROMPTS.map(({ prompt, outOfScope }) =>
        outOfScope ? (
          <div key={prompt} className="flex flex-col items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Chip type="button" variant="warning" onClick={() => onSelectPrompt(prompt)}>
                      {prompt}
                      <Info aria-hidden="true" className="hidden sm:block" />
                    </Chip>
                  }
                />
                <TooltipContent>{OUT_OF_SCOPE_HINT}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="flex items-center gap-1 text-center text-[0.7rem] text-muted-foreground sm:hidden">
              <Info aria-hidden="true" className="size-3 shrink-0 text-warning" />
              {OUT_OF_SCOPE_HINT}
            </span>
          </div>
        ) : (
          <Chip key={prompt} type="button" onClick={() => onSelectPrompt(prompt)}>
            {prompt}
          </Chip>
        ),
      )}
    </div>
  );
}
