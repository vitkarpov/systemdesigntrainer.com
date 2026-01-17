import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import Feedback from "@/pages/Feedback/Feedback";

// Mock API hooks
vi.mock("@/api/hooks.gen", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/api/hooks.gen")>();
  return {
    ...actual,
    useSessionsControllerGetFeedback: vi.fn(),
    useSessionsControllerGetFeedbackStatus: vi.fn(),
    useSessionsControllerGenerateFeedback: vi.fn(),
  };
});

// Mock router hooks
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ sessionId: "123" }),
    useNavigate: () => mockNavigate,
  };
});

// Mock useFeedback hook
vi.mock("../useFeedback", () => ({
  useFeedback: vi.fn(),
}));

import { useFeedback } from "../useFeedback";
const mockUseFeedback = useFeedback as ReturnType<typeof vi.fn>;

describe("Feedback - Navigation Consistency", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: successful feedback load
    const mockFeedbackData = {
      overallScore: 85,
      requirementsScore: 80,
      designScore: 90,
      communicationScore: 85,
      timeManagementScore: 80,
      depthScore: 85,
      items: [
        {
          type: "strength",
          category: "requirements",
          content: "Good requirement gathering",
          importance: "high",
        },
      ],
      nextSteps: ["Practice more complex designs"],
    };

    mockUseFeedback.mockReturnValue({
      state: "ready",
      feedback: mockFeedbackData,
      handleRetry: vi.fn(),
    });
  });

  describe("Navigation Elements", () => {
    it('should show visible "Back to Dashboard" button', () => {
      renderWithProviders(<Feedback />);

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons.length).toBeGreaterThan(0);
      expect(backButtons[0]).toBeVisible();
    });

    it('should navigate to "/" when back button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Feedback />);

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      await user.click(backButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it('should show "New Interview" button in header', () => {
      renderWithProviders(<Feedback />);

      // Should have at least one "New Interview" button (in header)
      const newInterviewButtons = screen.getAllByRole("button", {
        name: /new interview/i,
      });
      expect(newInterviewButtons.length).toBeGreaterThan(0);
    });

    it('should navigate to "/" when "New Interview" button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Feedback />);

      const newInterviewButton = screen.getAllByRole("button", {
        name: /new interview/i,
      })[0];
      await user.click(newInterviewButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("User Orientation", () => {
    it("should clearly indicate this is the feedback page", () => {
      renderWithProviders(<Feedback />);

      // Overall score should be prominently displayed
      expect(screen.getByText("85")).toBeInTheDocument();
    });

    it("should provide clear understanding of where they came from via back button", () => {
      renderWithProviders(<Feedback />);

      // Back button should have explicit label showing destination
      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons[0]).toHaveTextContent("Back to Dashboard");
    });

    it('should provide clear path forward with "New Interview" button', () => {
      renderWithProviders(<Feedback />);

      const newInterviewButton = screen.getAllByRole("button", {
        name: /new interview/i,
      })[0];
      expect(newInterviewButton).toBeInTheDocument();
    });
  });

  describe("Error State Navigation", () => {
    it('should show "Back to Home" button in error state', () => {
      mockUseFeedback.mockReturnValue({
        state: "failed",
        feedback: null,
        handleRetry: vi.fn(),
      });

      renderWithProviders(<Feedback />);

      expect(
        screen.getByRole("button", { name: /back to home/i }),
      ).toBeInTheDocument();
    });

    it('should navigate to "/" when "Back to Home" is clicked in error state', async () => {
      const user = userEvent.setup();
      mockUseFeedback.mockReturnValue({
        state: "failed",
        feedback: null,
        handleRetry: vi.fn(),
      });

      renderWithProviders(<Feedback />);

      const backButton = screen.getByRole("button", { name: /back to home/i });
      await user.click(backButton);

      expect(mockNavigate).toHaveBeenCalledWith("/");
    });
  });

  describe("Not Found State Navigation", () => {
    it('should show "Back to Dashboard" button in not found state', () => {
      mockUseFeedback.mockReturnValue({
        state: "not_found",
        feedback: null,
        handleRetry: vi.fn(),
      });

      renderWithProviders(<Feedback />);

      expect(
        screen.getByRole("button", { name: /back to dashboard/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Loading State Navigation", () => {
    it("should not show navigation elements during loading", () => {
      mockUseFeedback.mockReturnValue({
        state: "loading",
        feedback: null,
        handleRetry: vi.fn(),
      });

      renderWithProviders(<Feedback />);

      // Loading state should not have back button
      expect(
        screen.queryByRole("button", { name: /back to dashboard/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Processing State Navigation", () => {
    it("should not show navigation elements during processing", () => {
      mockUseFeedback.mockReturnValue({
        state: "processing",
        feedback: null,
        handleRetry: vi.fn(),
      });

      renderWithProviders(<Feedback />);

      // Processing state should not have back button
      expect(
        screen.queryByRole("button", { name: /back to dashboard/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Consistency with Other Pages", () => {
    it("should use same back button style as Home and Interview pages", () => {
      renderWithProviders(<Feedback />);

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });

      // Back button should exist and be clearly labeled
      expect(backButtons.length).toBeGreaterThan(0);
      expect(backButtons[0]).toHaveTextContent("Back to Dashboard");
    });

    it("should have both back navigation and forward navigation options", () => {
      renderWithProviders(<Feedback />);

      // Back option
      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons.length).toBeGreaterThan(0);

      // Forward option
      expect(
        screen.getAllByRole("button", { name: /new interview/i }).length,
      ).toBeGreaterThan(0);
    });
  });
});
