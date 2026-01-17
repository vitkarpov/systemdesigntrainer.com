import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreItem } from "./ScoreItem";

interface ScoreBreakdownCardProps {
  requirementsScore: number;
  designScore: number;
  communicationScore: number;
  timeManagementScore: number;
  depthScore: number;
}

export function ScoreBreakdownCard({
  requirementsScore,
  designScore,
  communicationScore,
  timeManagementScore,
  depthScore,
}: ScoreBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreItem
          label="Requirements Gathering"
          score={requirementsScore}
          weight="25%"
        />
        <ScoreItem label="System Design" score={designScore} weight="25%" />
        <ScoreItem
          label="Communication"
          score={communicationScore}
          weight="20%"
        />
        <ScoreItem
          label="Time Management"
          score={timeManagementScore}
          weight="15%"
        />
        <ScoreItem
          label="Depth & Scalability"
          score={depthScore}
          weight="15%"
        />
      </CardContent>
    </Card>
  );
}
