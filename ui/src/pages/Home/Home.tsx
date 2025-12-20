import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { UserMenu } from '../../components/UserMenu';
import { createSession, startSession, getCases, type Case } from '../../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);

  useEffect(() => {
    const fetchCases = async () => {
      try {
        const fetchedCases = await getCases();
        setCases(fetchedCases);
        // Set the first case as default if available
        if (fetchedCases.length > 0) {
          setSelectedCase(fetchedCases[0]);
        }
      } catch (err) {
        console.error('Failed to fetch cases:', err);
        setError('Failed to load cases. Please refresh the page.');
      }
    };

    fetchCases();
  }, []);

  const handleStartInterview = async () => {
    if (!selectedCase) {
      setError('Please select an interview case.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const session = await createSession(selectedCase.id);
      await startSession(session.id);
      navigate(`/interview/${session.id}`);
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError('Failed to start interview. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">SD Interview Simulator</h1>
          <UserMenu />
        </div>
      </header>
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
              disabled={isLoading}
              size="lg"
              className="w-full text-lg h-12"
            >
              {isLoading ? 'Starting Interview...' : 'Start Interview'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
