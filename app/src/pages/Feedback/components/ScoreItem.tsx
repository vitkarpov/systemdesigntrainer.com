import { getScoreBarColor } from '../utils';

interface ScoreItemProps {
  label: string;
  score: number;
  weight: string;
}

export function ScoreItem({ label, score, weight }: ScoreItemProps) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {score}/100 <span className="text-xs">({weight})</span>
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getScoreBarColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
