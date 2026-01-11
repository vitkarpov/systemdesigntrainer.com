import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { InterviewCounter } from '@/components/InterviewCounter';
import { PaywallModal } from '@/components/PaywallModal';
import {
  useCasesControllerGetAllCases,
  useSessionsControllerCreateSession,
  useSessionsControllerStartSession,
  useAuthControllerGetUser,
  type InterviewCaseDto,
} from '@/api/hooks.gen';

export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<InterviewCaseDto | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const { data: user } = useAuthControllerGetUser();
  const { data: cases = [], isLoading: isLoadingCases, error: casesError } = useCasesControllerGetAllCases();
  const createSessionMutation = useSessionsControllerCreateSession();
  const startSessionMutation = useSessionsControllerStartSession();

  useEffect(() => {
    if (cases.length > 0 && !selectedCase) {
      setSelectedCase(cases[0]);
    }
  }, [cases, selectedCase]);

  useEffect(() => {
    if (casesError) {
      setError('Failed to load cases. Please refresh the page.');
    }
  }, [casesError]);

  const handleStartInterview = async () => {
    if (!selectedCase) {
      setError('Please select an interview case.');
      return;
    }

    // Check if user has interviews remaining
    if (user?.subscriptionStatus !== 'unlimited' && (!user?.interviewsRemaining || user.interviewsRemaining <= 0)) {
      setShowPaywall(true);
      return;
    }

    setError(null);

    try {
      const sessionResponse = await createSessionMutation.mutateAsync({
        data: {
          caseId: selectedCase.id,
          companyStyle: 'generic',
          level: 'mid',
        },
      });

      await startSessionMutation.mutateAsync({
        id: sessionResponse.data.session.id,
      });

      // Invalidate queries so dashboard and counter update
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sessions/dashboard'] });

      navigate(`/interview/${sessionResponse.data.session.id}`);
    } catch (err) {
      console.error('Failed to start interview:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start interview. Please try again.';

      // Check if error is about no interviews remaining
      if (errorMessage.includes('no interviews remaining') || errorMessage.includes('403')) {
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
        onBack={() => navigate('/')}
        rightContent={
          <div className="flex items-center gap-3">
            <InterviewCounter />
          </div>
        }
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)]">
        <Card className="w-full max-w-6xl">
          <CardContent className="space-y-6 pt-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-3">Select an Interview Case:</h3>
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
                      <button
                        key={interviewCase.id}
                        onClick={() => setSelectedCase(interviewCase)}
                        className={`relative text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          selectedCase?.id === interviewCase.id
                            ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                            : 'border-muted bg-muted hover:border-muted-foreground/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold">{interviewCase.title}</h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                              interviewCase.difficulty === 'easy'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : interviewCase.difficulty === 'medium'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}
                          >
                            {interviewCase.difficulty}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {interviewCase.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Interview Format:</h3>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>45-60 minutes of interactive discussion</li>
                  <li>Progress through phases: requirements, design, deep-dive</li>
                  <li>AI interviewer tracks your signals and provides feedback</li>
                  <li>Receive detailed performance report at the end</li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Button
              onClick={handleStartInterview}
              disabled={isLoadingCases || createSessionMutation.isPending || startSessionMutation.isPending}
              size="lg"
              className="w-full text-lg h-12"
            >
              {createSessionMutation.isPending || startSessionMutation.isPending
                ? 'Starting Interview...'
                : 'Start Interview'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <PaywallModal open={showPaywall} onOpenChange={setShowPaywall} />
    </div>
  );
}
