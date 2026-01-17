import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldOff } from "lucide-react";

interface ForbiddenStateProps {
  onBackToHome: () => void;
  message?: string;
}

export function ForbiddenState({
  onBackToHome,
  message = "You don't have permission to access this interview.",
}: ForbiddenStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="p-6 w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-4 h-12 w-12 text-destructive">
            <ShieldOff className="h-full w-full" />
          </div>
          <CardTitle className="text-center">Access Denied</CardTitle>
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
