import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useAuthControllerGetUser } from '@/api/hooks.gen';

export function InterviewCounter() {
  const navigate = useNavigate();
  const { data: user } = useAuthControllerGetUser();

  if (!user) return null;

  const isUnlimited = user.subscriptionStatus === 'unlimited';
  const remaining = user.interviewsRemaining || 0;
  const needsMore = remaining === 0 && !isUnlimited;

  return (
    <Button
      variant={needsMore ? 'default' : 'outline'}
      size="sm"
      onClick={() => navigate('/pricing')}
      className="gap-2"
    >
      <Zap className="h-4 w-4" />
      {isUnlimited ? (
        <span>∞</span>
      ) : (
        <>
          <span>{remaining}</span>
          {needsMore && <Badge variant="destructive" className="ml-1">Get More</Badge>}
        </>
      )}
    </Button>
  );
}
