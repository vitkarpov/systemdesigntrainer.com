import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { useAuthControllerGetUser } from "@/api/hooks.gen";

export function InterviewCounter() {
  const navigate = useNavigate();
  const { data: user } = useAuthControllerGetUser();

  if (!user) return null;

  const isUnlimited = user.subscriptionStatus === "unlimited";
  const remaining = user.interviewsRemaining || 0;
  const needsMore = remaining === 0 && !isUnlimited;

  return (
    <button
      onClick={() => navigate("/pricing")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-muted/80 transition-colors text-sm font-medium cursor-pointer"
    >
      <Zap
        className={`h-3.5 w-3.5 ${needsMore ? "text-destructive" : "text-muted-foreground"}`}
      />
      <span
        className={
          needsMore ? "text-destructive font-semibold" : "text-muted-foreground"
        }
      >
        {isUnlimited ? "∞" : remaining}
      </span>
    </button>
  );
}
