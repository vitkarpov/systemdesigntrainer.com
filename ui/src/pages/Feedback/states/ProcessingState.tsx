import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface ProcessingStateProps {
  progress: number;
}

export function ProcessingState({ progress }: ProcessingStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="p-8 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Generating Feedback</CardTitle>
          <CardDescription className="text-center">
            Analyzing your interview performance...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-center text-muted-foreground">
            {progress}% complete
          </p>
          <p className="text-xs text-center text-muted-foreground">
            This usually takes 5-10 seconds
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
