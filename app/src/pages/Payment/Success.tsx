import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Invalidate queries to refetch updated interview count
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    queryClient.invalidateQueries({ queryKey: ["/api/sessions/dashboard"] });
    console.log("Payment successful! Refreshing user data...");
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your interview credits have been added to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-center text-muted-foreground">
              You can now start practicing your system design interviews. Your
              credits are ready to use!
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" size="lg" onClick={() => navigate("/")}>
            Go to Dashboard
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => navigate("/home")}
          >
            Start New Interview
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
