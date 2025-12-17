import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { getFeedback, type FeedbackReport } from '../../services/api';

export default function Feedback() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<FeedbackReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const loadFeedback = async () => {
      try {
        setIsLoading(true);
        const feedbackData = await getFeedback(Number(sessionId));
        setFeedback(feedbackData);
      } catch (err) {
        console.error('Failed to load feedback:', err);
        setError('Failed to load feedback');
      } finally {
        setIsLoading(false);
      }
    };

    loadFeedback();
  }, [sessionId]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading feedback...</div>
      </div>
    );
  }

  if (error || !feedback) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-destructive">{error || 'Feedback not found'}</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Interview Feedback</h1>
          <Button onClick={() => navigate('/')}>New Interview</Button>
        </div>

        {/* Overall Score */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Performance</CardTitle>
            <CardDescription>{feedback.summary}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={`text-6xl font-bold ${getScoreColor(feedback.overallScore)}`}>
                {feedback.overallScore}
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {getScoreLabel(feedback.overallScore)}
                </div>
                <div className="text-muted-foreground">out of 100</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Score Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScoreItem
              label="Requirements Gathering"
              score={feedback.requirementsScore}
              weight="25%"
            />
            <ScoreItem
              label="System Design"
              score={feedback.designScore}
              weight="25%"
            />
            <ScoreItem
              label="Communication"
              score={feedback.communicationScore}
              weight="20%"
            />
            <ScoreItem
              label="Time Management"
              score={feedback.timeManagementScore}
              weight="15%"
            />
            <ScoreItem
              label="Depth & Scalability"
              score={feedback.depthScore}
              weight="15%"
            />
          </CardContent>
        </Card>

        {/* Strengths */}
        {feedback.feedbackItems.filter(item => item.category === 'strength').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-green-600">✓</span> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.feedbackItems
                .filter(item => item.category === 'strength')
                .map((item, idx) => (
                  <div key={idx} className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {feedback.feedbackItems.filter(item => item.category === 'weakness').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-red-600">!</span> Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.feedbackItems
                .filter(item => item.category === 'weakness')
                .map((item, idx) => (
                  <div key={idx} className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {feedback.feedbackItems.filter(item => item.category === 'suggestion').length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-600">💡</span> Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.feedbackItems
                .filter(item => item.category === 'suggestion')
                .map((item, idx) => (
                  <div key={idx} className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                    <h4 className="font-semibold mb-1">{item.title}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        {feedback.nextSteps.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
              <CardDescription>Recommended actions to improve your skills</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {feedback.nextSteps.map((step, idx) => (
                <div key={idx} className="flex gap-3 p-4 bg-muted rounded-lg">
                  <div>
                    <Badge
                      variant={
                        step.priority === 'high'
                          ? 'destructive'
                          : step.priority === 'medium'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {step.priority}
                    </Badge>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{step.title}</h4>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ScoreItem({ label, score, weight }: { label: string; score: number; weight: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {score}/100 <span className="text-xs">({weight})</span>
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
