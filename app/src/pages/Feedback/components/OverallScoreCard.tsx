import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getScoreColor, getScoreLabel } from '../utils';

interface OverallScoreCardProps {
  score: number;
}

export function OverallScoreCard({ score }: OverallScoreCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overall Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div>
            <div className="text-2xl font-semibold">
              {getScoreLabel(score)}
            </div>
            <div className="text-muted-foreground">out of 100</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
