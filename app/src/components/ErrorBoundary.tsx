import { Component, type ReactNode } from "react";
import { ApiError } from "@/api/client";
import { ForbiddenState } from "@/pages/shared/ForbiddenState";
import { NotFoundState } from "@/pages/shared/NotFoundState";
import { ErrorState } from "@/pages/shared/ErrorState";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  onBackToHome: () => void;
  context?: "interview" | "feedback";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const { onBackToHome, context } = this.props;

      // Handle ApiError with specific status codes
      if (error instanceof ApiError) {
        // 403 Forbidden
        if (error.status === 403) {
          return <ForbiddenState onBackToHome={onBackToHome} />;
        }

        // 404 Not Found
        if (error.status === 404) {
          const title =
            context === "interview"
              ? "Interview Not Found"
              : "Feedback Not Found";
          const message =
            context === "interview"
              ? "The interview you're looking for doesn't exist or has been removed."
              : "The feedback you're looking for doesn't exist or hasn't been generated yet.";

          return (
            <NotFoundState
              onBackToHome={onBackToHome}
              title={title}
              message={message}
            />
          );
        }
      }

      // Generic error fallback
      return (
        <ErrorState
          error={error.message}
          onRetry={this.handleRetry}
          onBackToHome={onBackToHome}
        />
      );
    }

    return this.props.children;
  }
}
