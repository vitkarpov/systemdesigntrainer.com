import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../components/ui/dropdown-menu';
import { createSession, startSession, getCases, getUser, logout, type Case, type User } from '../../services/api';

export default function Home() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch user data
        const userData = await getUser();
        setUser(userData);

        // Fetch cases
        const fetchedCases = await getCases();
        setCases(fetchedCases);
        // Set the first case as default if available
        if (fetchedCases.length > 0) {
          setSelectedCase(fetchedCases[0]);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('Failed to load data. Please refresh the page.');
      }
    };

    fetchData();
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user) return 'U';
    const names = user.name.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return names[0][0].toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between px-4">
          <h1 className="text-lg font-semibold">SD Interview Simulator</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-ring rounded-full">
                <Avatar className="cursor-pointer">
                  <AvatarImage src={user?.avatarUrl} alt={user?.name || user?.email || 'User'} />
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
