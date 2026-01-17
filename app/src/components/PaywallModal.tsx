import { useNavigate } from "react-router-dom";
import { AlertCircle, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaywallModal({ open, onOpenChange }: PaywallModalProps) {
  const navigate = useNavigate();

  const handleViewPricing = () => {
    onOpenChange(false);
    navigate("/pricing");
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
            <AlertCircle className="h-6 w-6 text-orange-600" />
          </div>
          <AlertDialogTitle className="text-center">
            No Interviews Remaining
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            You've used all your interview credits. Purchase more to continue
            practicing your system design skills.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Starter Pack</p>
              <p className="text-sm text-muted-foreground">3 interviews</p>
            </div>
            <p className="text-lg font-bold">$9</p>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="font-medium">Power Pack</p>
              <p className="text-sm text-muted-foreground">5 interviews</p>
            </div>
            <p className="text-lg font-bold">$12</p>
          </div>
        </div>

        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleViewPricing} className="gap-2">
            <Zap className="h-4 w-4" />
            View Pricing
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
