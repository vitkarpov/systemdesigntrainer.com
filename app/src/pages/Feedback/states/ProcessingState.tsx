import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export function ProcessingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="p-8 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Generating Feedback</CardTitle>
          <CardDescription className="text-center">
            Analyzing your interview performance...
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-center text-muted-foreground">
            This usually takes 30 seconds. Stay tuned 👀
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
