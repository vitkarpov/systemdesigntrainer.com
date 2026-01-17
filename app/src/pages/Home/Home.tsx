import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { InterviewCounter } from "@/components/InterviewCounter";
import { PaywallModal } from "@/components/PaywallModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCasesControllerGetAllCases,
  useSessionsControllerCreateSession,
  useSessionsControllerStartSession,
  useAuthControllerGetUser,
  type InterviewCaseDto,
  type CreateSessionDtoCompanyStyle,
  type CreateSessionDtoLevel,
} from "@/api/hooks.gen";
import { posthog } from "@/lib/posthog";

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [level, setLevel] = useState<CreateSessionDtoLevel>("mid");
  const [companyStyle, setCompanyStyle] =
    useState<CreateSessionDtoCompanyStyle>("generic");

  const { data: user } = useAuthControllerGetUser();
  const {
    data: cases = [],
    isLoading: isLoadingCases,
    error: casesError,
  } = useCasesControllerGetAllCases();
  const createSessionMutation = useSessionsControllerCreateSession();
  const startSessionMutation = useSessionsControllerStartSession();

  useEffect(() => {
    if (casesError) {
      setError("Failed to load cases. Please refresh the page.");
    }
  }, [casesError]);

  const hasUserInterviewsRemaining = useMemo(
    () =>
      user?.subscriptionStatus !== "unlimited" &&
      (!user?.interviewsRemaining || user.interviewsRemaining <= 0),
    [user],
  );

  const handleStartInterview = async (interviewCase: InterviewCaseDto) => {
    if (hasUserInterviewsRemaining) {
      setShowPaywall(true);
      return;
    }

    setError(null);

    try {
      const sessionResponse = await createSessionMutation.mutateAsync({
        data: {
          caseId: interviewCase.id,
          companyStyle,
          level,
        },
      });

      await startSessionMutation.mutateAsync({
        id: sessionResponse.data.session.id,
      });

      // Track interview started
      posthog.capture("interview_started", {
        sessionId: sessionResponse.data.session.id,
        caseId: interviewCase.id,
        caseTitle: interviewCase.title,
        caseDifficulty: interviewCase.difficulty,
        companyStyle,
        level,
      });

      // Invalidate queries so dashboard and counter update
      queryClient.invalidateQueries({ queryKey: ["/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/sessions/dashboard"] });

      navigate(`/interview/${sessionResponse.data.session.id}`);
    } catch (err) {
      console.error("Failed to start interview:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to start interview. Please try again.";

      // Check if error is about no interviews remaining
      if (
        errorMessage.includes("no interviews remaining") ||
        errorMessage.includes("403")
      ) {
        setShowPaywall(true);
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <PageHeader
        backLabel="Back to Dashboard"
        onBack={() => navigate("/")}
        rightContent={
          <div className="flex items-center gap-3">
            <InterviewCounter />
          </div>
        }
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)]">
        <Card className="w-full max-w-6xl">
          <CardContent className="space-y-6 pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <div className="mb-1">
                  <label className="text-sm font-medium">Candidate Level</label>
                </div>
                <Select
                  value={level}
                  onValueChange={(value) =>
                    setLevel(value as CreateSessionDtoLevel)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mid">Mid-Level</SelectItem>
                    <SelectItem value="senior">Senior</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="mb-1">
                  <label className="text-sm font-medium">Company Style</label>
                </div>
                <Select
                  value={companyStyle}
                  onValueChange={(value) =>
                    setCompanyStyle(value as CreateSessionDtoCompanyStyle)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faang">FAANG</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="generic">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Select an Interview Case:</h3>
              {isLoadingCases ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading interview cases...
                </div>
              ) : cases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No interview cases available
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {cases.map((interviewCase) => (
                    <Button
                      key={interviewCase.id}
                      variant="outline"
                      onClick={() => handleStartInterview(interviewCase)}
                      disabled={
                        createSessionMutation.isPending ||
                        startSessionMutation.isPending
                      }
                      className="relative text-left p-4 h-auto flex-col items-start hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2 w-full">
                        <h4 className="font-semibold">{interviewCase.title}</h4>
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                            interviewCase.difficulty === "easy"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : interviewCase.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}
                        >
                          {interviewCase.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-left">
                        {interviewCase.description}
                      </p>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted rounded-lg p-4">
              <h3 className="font-semibold mb-2">Interview Format:</h3>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>45-60 minutes of interactive discussion</li>
                <li>
                  Progress through phases: requirements, design, deep-dive
                </li>
                <li>
                  AI interviewer tracks your signals and provides feedback
                </li>
                <li>Receive detailed performance report at the end</li>
              </ul>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
