import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/PageHeader';
import { UserMenu } from '@/components/UserMenu';
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
        title="SD Interview Simulator"
        backLabel="Back to Dashboard"
        onBack={() => navigate('/')}
        rightContent={
          <div className="flex items-center gap-3">
            <InterviewCounter />
            <UserMenu />
          </div>
        }
      />
      <div className="flex items-center justify-center p-4 min-h-[calc(100vh-3.5rem)]">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl mb-2">System Design Interview Simulator</CardTitle>
            <CardDescription className="text-lg">
              Practice system design interviews with an AI interviewer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {selectedCase && (
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold mb-2">
                    Current Case: {selectedCase.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedCase.description}
                  </p>
                </div>
              )}

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
