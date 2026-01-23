import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScoreColor, getScoreLabel } from "../utils";

interface OverallScoreCardProps {
  score: number;
}

export function OverallScoreCard({ score }: OverallScoreCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-bold">Overall Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
            {score}
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">{getScoreLabel(score)}</div>
            <div className="text-sm text-muted-foreground/70">out of 100</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
