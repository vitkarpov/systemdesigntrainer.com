import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface NotFoundStateProps {
  onBackToHome: () => void;
}

export function NotFoundState({ onBackToHome }: NotFoundStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="p-6">
        <p className="text-destructive">Feedback not found</p>
        <Button onClick={onBackToHome} className="mt-4">
          Back to Home
        </Button>
      </Card>
    </div>
  );
}
