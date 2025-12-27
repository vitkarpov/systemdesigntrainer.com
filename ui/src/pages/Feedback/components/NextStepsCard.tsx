import type { FeedbackNextStepDto } from '@/api/hooks.gen';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


interface NextStepsCardProps {
  steps: FeedbackNextStepDto[];
}

export function NextStepsCard({ steps }: NextStepsCardProps) {
  if (!steps || steps.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Steps</CardTitle>
        <CardDescription>Recommended actions to improve your skills</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
