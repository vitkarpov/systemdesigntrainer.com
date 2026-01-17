import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorStateProps {
  error?: string;
  onRetry: () => void;
  onBackToHome: () => void;
}

export function ErrorState({ error, onRetry, onBackToHome }: ErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="p-6 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">
            Something Went Wrong
          </CardTitle>
          <CardDescription>
            {error || "An unexpected error occurred. Please try again."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={onRetry} className="w-full">
            Try Again
          </Button>
          <Button onClick={onBackToHome} variant="outline" className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
