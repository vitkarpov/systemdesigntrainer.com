import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ButtonBar } from "@/components/ui/button-bar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Page, Container, Stack, Flex } from "@/components/layout";
import { InterviewCounter } from "@/components/InterviewCounter";
import {
  useAuthControllerGetUser,
  useSessionsControllerGetDashboard,
} from "@/api/hooks.gen";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useSessionsControllerGetDashboard();
  const { data: user } = useAuthControllerGetUser();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6">
          <p className="text-destructive">Failed to load dashboard</p>
        </Card>
      </div>
    );
  }

  const { sessions, stats } = data.data;

  return (
    <Page>
      <Stack gap="6">
        <PageHeader
          title={`👋, ${user?.name ?? "Anonymous"}`}
          rightContent={
            <ButtonBar gap="sm">
              <InterviewCounter />
              <Button onClick={() => navigate("/home")} variant="gradient">
                New Interview
              </Button>
            </ButtonBar>
          }
        />
        <Container maxWidth="6xl" gap="6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">
                Total Interviews
              </div>
              <div className="text-3xl font-bold mt-2">
                {stats.totalSessions}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Completed</div>
              <div className="text-3xl font-bold mt-2">
                {stats.completedSessions}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground">Average Score</div>
              <div className="text-3xl font-bold mt-2">
                {stats.averageScore !== null
                  ? `${stats.averageScore}/100`
                  : "N/A"}
              </div>
            </Card>
          </div>

          {/* Sessions List */}
          <Stack gap="4">
            <h2 className="text-xl font-semibold">Your Interviews</h2>

            {sessions.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground mb-4">No interviews yet</p>
                <Button onClick={() => navigate("/home")}>
                  Start Your First Interview
                </Button>
              </Card>
            ) : (
              <Stack gap="3">
                {sessions.map((session) => (
                  <Card
                    key={session.id}
                    className="p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <Stack gap="3" className="flex-1">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {session.interviewCase?.title || "Unknown Case"}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {session.interviewCase?.description}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <Flex align="center" gap="1">
                            <span className="text-muted-foreground">
                              Status:
                            </span>
                            <span
                              className={`font-medium ${
                                session.status === "completed"
                                  ? "text-green-600"
                                  : session.status === "in_progress"
                                    ? "text-blue-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {session.status === "not_started"
                                ? "Not Started"
                                : session.status === "in_progress"
                                  ? "In Progress"
                                  : "Completed"}
                            </span>
                          </Flex>
                          <span className="text-muted-foreground">
                            {session.completedAt
                              ? formatDistanceToNow(
                                  new Date(session.completedAt),
                                  { addSuffix: true },
                                )
                              : formatDistanceToNow(
                                  new Date(session.createdAt),
                                  { addSuffix: true },
                                )}
                          </span>
                        </div>

                        {session.overallScore !== null && (
                          <div className="flex flex-wrap gap-3 text-sm">
                            <span>
                              <span className="text-muted-foreground">
                                Overall:
                              </span>
                              <span className="font-semibold ml-1">
                                {session.overallScore}/100
                              </span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">
                                Requirements:
                              </span>
                              <span className="font-semibold ml-1">
                                {session.requirementsScore}/100
                              </span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">
                                Design:
                              </span>
                              <span className="font-semibold ml-1">
                                {session.designScore}/100
                              </span>
                            </span>
                            <span>
                              <span className="text-muted-foreground">
                                Communication:
                              </span>
                              <span className="font-semibold ml-1">
                                {session.communicationScore}/100
                              </span>
                            </span>
                          </div>
                        )}
                      </Stack>

                      <div className="flex gap-2 w-full md:w-auto md:flex-col md:min-w-[140px]">
                        <Button
                          onClick={() => navigate(`/interview/${session.id}`)}
                          variant="primary"
                          size="sm"
                          className="flex-1 md:flex-initial"
                        >
                          {session.status === "in_progress"
                            ? "Continue"
                            : "View Session"}
                        </Button>
                        {session.overallScore !== null && (
                          <Button
                            onClick={() => navigate(`/feedback/${session.id}`)}
                            variant="outline"
                            size="sm"
                            className="flex-1 md:flex-initial"
                          >
                            View Feedback
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </Stack>
            )}
          </Stack>
        </Container>
      </Stack>
    </Page>
  );
}
