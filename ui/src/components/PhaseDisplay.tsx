import { Badge } from './ui/badge';
import { Clock } from 'lucide-react';

interface PhaseMetadata {
  name: string;
  description: string;
  order: number;
  recommendedMinutes: number;
}

interface PhaseDisplayProps {
  phaseMetadata: PhaseMetadata;
  phaseElapsedSeconds: number;
}

export function PhaseDisplay({ phaseMetadata, phaseElapsedSeconds }: PhaseDisplayProps) {
  const phaseElapsedMinutes = Math.floor(phaseElapsedSeconds / 60);
  const phaseElapsedSecondsPart = phaseElapsedSeconds % 60;
  const isOverTime = phaseElapsedMinutes >= phaseMetadata.recommendedMinutes;

  return (
    <div className="bg-muted/50 rounded-lg px-4 py-3 flex-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge variant="secondary" className="text-xs font-medium shrink-0">
            Phase {phaseMetadata.order}/6
          </Badge>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{phaseMetadata.name}</h2>
            <p className="text-sm text-muted-foreground">{phaseMetadata.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm shrink-0">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className={isOverTime ? 'text-orange-600 dark:text-orange-400 font-semibold' : 'font-medium'}>
            {phaseElapsedMinutes}:{phaseElapsedSecondsPart.toString().padStart(2, '0')}
          </span>
          <span className="text-muted-foreground">/ {phaseMetadata.recommendedMinutes} min</span>
        </div>
      </div>
    </div>
  );
}
