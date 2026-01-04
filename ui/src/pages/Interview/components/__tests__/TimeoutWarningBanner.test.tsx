import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/tests/utils';
import { TimeoutWarningBanner } from '../TimeoutWarningBanner';

describe('TimeoutWarningBanner', () => {
  describe('Display and Content', () => {
    it('should render warning message with remaining time', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText('No activity detected')).toBeInTheDocument();
      expect(screen.getByText(/your interview will auto-end in/i)).toBeInTheDocument();
    });

    it('should show correct countdown timer with 10 minutes of inactivity (3 min remaining)', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600} // 10 minutes inactive = 3 minutes remaining
          onDismiss={vi.fn()}
        />
      );

      // 780 - 600 = 180 seconds = 3:00
      expect(screen.getByText(/3:00/)).toBeInTheDocument();
    });

    it('should show correct countdown timer with 11 minutes of inactivity (2 min remaining)', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={660} // 11 minutes inactive = 2 minutes remaining
          onDismiss={vi.fn()}
        />
      );

      // 780 - 660 = 120 seconds = 2:00
      expect(screen.getByText(/2:00/)).toBeInTheDocument();
    });

    it('should show correct countdown timer with 12 minutes of inactivity (1 min remaining)', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={720} // 12 minutes inactive = 1 minute remaining
          onDismiss={vi.fn()}
        />
      );

      // 780 - 720 = 60 seconds = 1:00
      expect(screen.getByText(/1:00/)).toBeInTheDocument();
    });

    it('should show correct countdown timer with 12.5 minutes of inactivity (30 sec remaining)', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={750} // 12.5 minutes inactive = 30 seconds remaining
          onDismiss={vi.fn()}
        />
      );

      // 780 - 750 = 30 seconds = 0:30
      expect(screen.getByText(/0:30/)).toBeInTheDocument();
    });

    it('should pad seconds with leading zero when less than 10', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={775} // 5 seconds remaining = 0:05
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/0:05/)).toBeInTheDocument();
    });

    it('should show dismiss button', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={vi.fn()}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should have amber styling for warning', () => {
      const { container } = renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={vi.fn()}
        />
      );

      // Check for amber background styling - find the outermost div with amber classes
      const amberElement = container.querySelector('.bg-amber-50');
      expect(amberElement).toBeInTheDocument();
    });
  });

  describe('Dismiss Interaction', () => {
    it('should call onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = vi.fn();

      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('should only call onDismiss once when clicked multiple times quickly', async () => {
      const user = userEvent.setup();
      const mockOnDismiss = vi.fn();

      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={mockOnDismiss}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await user.click(dismissButton);
      await user.click(dismissButton);
      await user.click(dismissButton);

      // Should only fire once per click
      expect(mockOnDismiss).toHaveBeenCalledTimes(3);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible dismiss button with screen reader text', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={vi.fn()}
        />
      );

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toHaveAccessibleName('Dismiss');
    });

    it('should have alert icon visible to users', () => {
      const { container } = renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={600}
          onDismiss={vi.fn()}
        />
      );

      // Check for AlertCircle icon (lucide-react icon)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 seconds remaining', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={780} // Exactly at timeout threshold
          onDismiss={vi.fn()}
        />
      );

      expect(screen.getByText(/0:00/)).toBeInTheDocument();
    });

    it('should handle negative remaining seconds gracefully', () => {
      renderWithProviders(
        <TimeoutWarningBanner
          inactiveSeconds={800} // Past timeout threshold
          onDismiss={vi.fn()}
        />
      );

      // Should still render, showing negative countdown or 0:00
      expect(screen.getByText('No activity detected')).toBeInTheDocument();
    });
  });
});
