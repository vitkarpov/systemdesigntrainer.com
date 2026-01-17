import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/tests/utils";
import { PageHeader } from "@/components/PageHeader";

describe("PageHeader - Navigation Consistency", () => {
  describe("Back Button Visibility", () => {
    it("should show back button when both onBack and backLabel are provided", () => {
      const mockOnBack = vi.fn();

      renderWithProviders(
        <PageHeader
          title="Test Page"
          onBack={mockOnBack}
          backLabel="Back to Dashboard"
        />,
      );

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons.length).toBeGreaterThan(0);
      expect(backButtons[0]).toHaveTextContent("Back to Dashboard");
    });

    it("should NOT show back button when backLabel is missing", () => {
      const mockOnBack = vi.fn();

      renderWithProviders(<PageHeader title="Test Page" onBack={mockOnBack} />);

      expect(
        screen.queryByRole("button", { name: /back/i }),
      ).not.toBeInTheDocument();
    });

    it("should NOT show back button when onBack is missing", () => {
      renderWithProviders(
        <PageHeader title="Test Page" backLabel="Back to Dashboard" />,
      );

      expect(
        screen.queryByRole("button", { name: /back/i }),
      ).not.toBeInTheDocument();
    });

    it("should NOT show back button when both onBack and backLabel are missing", () => {
      renderWithProviders(<PageHeader title="Test Page" />);

      expect(
        screen.queryByRole("button", { name: /back/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Back Button Interaction", () => {
    it("should call onBack when back button is clicked", async () => {
      const user = userEvent.setup();
      const mockOnBack = vi.fn();

      renderWithProviders(
        <PageHeader
          title="Test Page"
          onBack={mockOnBack}
          backLabel="Back to Dashboard"
        />,
      );

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      await user.click(backButtons[0]);

      expect(mockOnBack).toHaveBeenCalledTimes(1);
    });
  });

  describe("Title Display", () => {
    it("should always display the title", () => {
      renderWithProviders(
        <PageHeader title="System Design Interview Simulator" />,
      );

      expect(
        screen.getByText("System Design Interview Simulator"),
      ).toBeInTheDocument();
    });

    it("should display title even when back button is shown", () => {
      renderWithProviders(
        <PageHeader
          title="Interview Feedback"
          onBack={vi.fn()}
          backLabel="Back to Dashboard"
        />,
      );

      expect(screen.getByText("Interview Feedback")).toBeInTheDocument();
      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Right Content", () => {
    it("should display right content when provided", () => {
      renderWithProviders(
        <PageHeader
          title="Test Page"
          rightContent={<button>New Interview</button>}
        />,
      );

      expect(
        screen.getByRole("button", { name: /new interview/i }),
      ).toBeInTheDocument();
    });

    it("should display both back button and right content", () => {
      renderWithProviders(
        <PageHeader
          title="Test Page"
          onBack={vi.fn()}
          backLabel="Back to Dashboard"
          rightContent={<button>New Interview</button>}
        />,
      );

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      expect(backButtons.length).toBeGreaterThan(0);
      expect(
        screen.getByRole("button", { name: /new interview/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Center Content", () => {
    it("should display center content when provided", () => {
      renderWithProviders(
        <PageHeader
          title="Test Page"
          centerContent={<div>Phase Display</div>}
        />,
      );

      expect(screen.getByText("Phase Display")).toBeInTheDocument();
    });
  });

  describe("Arrow Icon", () => {
    it("should show left arrow icon with back button", () => {
      renderWithProviders(
        <PageHeader
          title="Test Page"
          onBack={vi.fn()}
          backLabel="Back to Dashboard"
        />,
      );

      const backButtons = screen.getAllByRole("button", {
        name: /back to dashboard/i,
      });
      const svg = backButtons[0].querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });
});
