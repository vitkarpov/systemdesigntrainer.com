import type { FeedbackNextStepDto } from "@/api/hooks.gen";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
        <CardTitle className="font-bold">Next Steps</CardTitle>
        <CardDescription>
          Recommended actions to improve your skills
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="p-4 bg-muted/40 rounded-lg border border-border/30"
          >
            <p className="text-sm font-medium text-foreground leading-relaxed">
              {step.description}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
