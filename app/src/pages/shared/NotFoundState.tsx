import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

interface NotFoundStateProps {
  onBackToHome: () => void;
  title?: string;
  message?: string;
}

export function NotFoundState({
  onBackToHome,
  title = "Not Found",
  message = "The resource you're looking for doesn't exist or has been removed.",
}: NotFoundStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="p-6 w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
            <FileQuestion className="h-full w-full" />
          </div>
          <CardTitle className="text-center">{title}</CardTitle>
          <CardDescription className="text-center">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onBackToHome} className="w-full">
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
