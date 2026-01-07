import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils'
import Dashboard from '@/pages/Dashboard/Dashboard'

// Mock API hooks
vi.mock('@/api/hooks.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hooks.gen')>();
  return {
    ...actual,
    useSessionsControllerGetDashboard: vi.fn(),
  };
})

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import { useSessionsControllerGetDashboard } from '@/api/hooks.gen'
const mockUseDashboard = useSessionsControllerGetDashboard as ReturnType<typeof vi.fn>

describe('Dashboard - Navigation Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock: successful dashboard load
    mockUseDashboard.mockReturnValue({
      data: {
        data: {
          sessions: [],
          stats: {
            totalSessions: 0,
            completedSessions: 0,
            averageScore: null,
          },
        },
      },
      isLoading: false,
      error: null,
    })
  })

  describe('Navigation Elements', () => {
    it('should NOT show a back button (Dashboard is the root page)', () => {
      renderWithProviders(<Dashboard />)

      // There should be no back button or "Back to Dashboard" text
      expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
      expect(screen.queryByText(/back to/i)).not.toBeInTheDocument()
    })

    it('should display the page title', () => {
      renderWithProviders(<Dashboard />)

      expect(screen.getByText('System Design Interview Simulator')).toBeInTheDocument()
    })

    it('should show "New Interview" button', () => {
      renderWithProviders(<Dashboard />)

      const newInterviewButton = screen.getByRole('button', { name: /new interview/i })
      expect(newInterviewButton).toBeInTheDocument()
    })

    it('should navigate to /home when "New Interview" is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Dashboard />)

      const newInterviewButton = screen.getByRole('button', { name: /new interview/i })
      await user.click(newInterviewButton)

      expect(mockNavigate).toHaveBeenCalledWith('/home')
    })
  })

  describe('Session Navigation', () => {
    it('should show "View Session" button for completed sessions', () => {
      mockUseDashboard.mockReturnValue({
        data: {
          data: {
            sessions: [
              {
                id: 1,
                status: 'completed',
                createdAt: new Date().toISOString(),
                interviewCase: {
                  title: 'Design a URL Shortener',
                  description: 'Test description',
                },
                overallScore: 85,
                requirementsScore: 80,
                designScore: 90,
                communicationScore: 85,
              },
            ],
            stats: { totalSessions: 1, completedSessions: 1, averageScore: 85 },
          },
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Dashboard />)

      expect(screen.getByRole('button', { name: /view session/i })).toBeInTheDocument()
    })

    it('should navigate to interview page when "View Session" is clicked', async () => {
      const user = userEvent.setup()
      mockUseDashboard.mockReturnValue({
        data: {
          data: {
            sessions: [
              {
                id: 123,
                status: 'completed',
                createdAt: new Date().toISOString(),
                interviewCase: {
                  title: 'Design a URL Shortener',
                  description: 'Test description',
                },
                overallScore: null,
              },
            ],
            stats: { totalSessions: 1, completedSessions: 1, averageScore: null },
          },
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Dashboard />)

      const viewButton = screen.getByRole('button', { name: /view session/i })
      await user.click(viewButton)

      expect(mockNavigate).toHaveBeenCalledWith('/interview/123')
    })

    it('should show "View Feedback" button for sessions with scores', async () => {
      mockUseDashboard.mockReturnValue({
        data: {
          data: {
            sessions: [
              {
                id: 456,
                status: 'completed',
                createdAt: new Date().toISOString(),
                interviewCase: {
                  title: 'Design a URL Shortener',
                  description: 'Test description',
                },
                overallScore: 85,
                requirementsScore: 80,
                designScore: 90,
                communicationScore: 85,
              },
            ],
            stats: { totalSessions: 1, completedSessions: 1, averageScore: 85 },
          },
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Dashboard />)

      expect(screen.getByRole('button', { name: /view feedback/i })).toBeInTheDocument()
    })

    it('should navigate to feedback page when "View Feedback" is clicked', async () => {
      const user = userEvent.setup()
      mockUseDashboard.mockReturnValue({
        data: {
          data: {
            sessions: [
              {
                id: 456,
                status: 'completed',
                createdAt: new Date().toISOString(),
                interviewCase: {
                  title: 'Design a URL Shortener',
                  description: 'Test description',
                },
                overallScore: 85,
                requirementsScore: 80,
                designScore: 90,
                communicationScore: 85,
              },
            ],
            stats: { totalSessions: 1, completedSessions: 1, averageScore: 85 },
          },
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<Dashboard />)

      const feedbackButton = screen.getByRole('button', { name: /view feedback/i })
      await user.click(feedbackButton)

      expect(mockNavigate).toHaveBeenCalledWith('/feedback/456')
    })
  })

  describe('User Orientation - Dashboard as Root', () => {
    it('should clearly indicate this is the main dashboard', () => {
      renderWithProviders(<Dashboard />)

      // Page title should be visible
      expect(screen.getByText('System Design Interview Simulator')).toBeInTheDocument()

      // Stats section should be visible (indicating this is the overview page)
      expect(screen.getByText('Total Interviews')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('Average Score')).toBeInTheDocument()
    })

    it('should provide clear path forward with "New Interview" button', () => {
      renderWithProviders(<Dashboard />)

      // Should have prominent "New Interview" button to guide users
      const newInterviewButton = screen.getByRole('button', { name: /new interview/i })
      expect(newInterviewButton).toBeInTheDocument()
    })
  })
})
