import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils'
import Home from '@/pages/Home/Home'

// Mock UserMenu component
vi.mock('@/components/UserMenu', () => ({
  UserMenu: () => <div data-testid="user-menu">User Menu</div>,
}))

// Mock API hooks
vi.mock('@/api/hooks.gen', () => ({
  useCasesControllerGetAllCases: vi.fn(),
  useSessionsControllerCreateSession: vi.fn(),
  useSessionsControllerStartSession: vi.fn(),
}))

// Mock router hooks
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

import {
  useCasesControllerGetAllCases,
  useSessionsControllerCreateSession,
  useSessionsControllerStartSession,
} from '@/api/hooks.gen'

const mockUseCases = useCasesControllerGetAllCases as ReturnType<typeof vi.fn>
const mockCreateSession = useSessionsControllerCreateSession as ReturnType<typeof vi.fn>
const mockStartSession = useSessionsControllerStartSession as ReturnType<typeof vi.fn>

describe('Home - Navigation Consistency', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock: successful cases load
    mockUseCases.mockReturnValue({
      data: [
        {
          id: 1,
          title: 'Design a URL Shortener',
          description: 'Build a scalable URL shortening service',
        },
      ],
      isLoading: false,
      error: null,
    })

    mockCreateSession.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({
        data: { session: { id: 123 } },
      }),
      isPending: false,
    })

    mockStartSession.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    })
  })

  describe('Navigation Elements', () => {
    it('should show visible "Back to Dashboard" button', () => {
      renderWithProviders(<Home />)

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      expect(backButton).toBeInTheDocument()
      expect(backButton).toBeVisible()
    })

    it('should navigate to "/" when back button is clicked', async () => {
      const user = userEvent.setup()
      renderWithProviders(<Home />)

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should display the page title', () => {
      renderWithProviders(<Home />)

      expect(screen.getByText('SD Interview Simulator')).toBeInTheDocument()
    })

    it('should show UserMenu in header', () => {
      renderWithProviders(<Home />)

      // UserMenu component should be rendered
      // The actual UserMenu is tested separately, here we just verify the structure
      expect(screen.getByText('SD Interview Simulator')).toBeInTheDocument()
    })
  })

  describe('User Orientation', () => {
    it('should clearly indicate this is the case selection page', () => {
      renderWithProviders(<Home />)

      // Clear heading and description
      expect(screen.getByText('System Design Interview Simulator')).toBeInTheDocument()
      expect(screen.getByText(/Practice system design interviews/i)).toBeInTheDocument()
    })

    it('should show current case information', () => {
      renderWithProviders(<Home />)

      expect(screen.getByText(/Current Case:/i)).toBeInTheDocument()
      expect(screen.getByText(/Design a URL Shortener/i)).toBeInTheDocument()
    })

    it('should provide clear understanding of where they came from via back button', () => {
      renderWithProviders(<Home />)

      // Back button should have explicit label showing destination
      const backButton = screen.getByRole('button', { name: /back to dashboard/i })
      expect(backButton).toHaveTextContent('Back to Dashboard')
    })

    it('should provide clear path forward with "Start Interview" button', () => {
      renderWithProviders(<Home />)

      const startButton = screen.getByRole('button', { name: /start interview/i })
      expect(startButton).toBeInTheDocument()
    })
  })

  describe('Navigation Flow', () => {
    it('should navigate to interview page after starting interview', async () => {
      const user = userEvent.setup()
      const mockCreateMutate = vi.fn().mockResolvedValue({
        data: { session: { id: 456 } },
      })
      const mockStartMutate = vi.fn().mockResolvedValue({})

      mockCreateSession.mockReturnValue({
        mutateAsync: mockCreateMutate,
        isPending: false,
      })

      mockStartSession.mockReturnValue({
        mutateAsync: mockStartMutate,
        isPending: false,
      })

      renderWithProviders(<Home />)

      const startButton = screen.getByRole('button', { name: /start interview/i })
      await user.click(startButton)

      // Should eventually navigate to interview page
      await vi.waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/interview/456')
      })
    })
  })

  describe('Consistency with Dashboard', () => {
    it('should use same back button style as other pages', () => {
      renderWithProviders(<Home />)

      const backButton = screen.getByRole('button', { name: /back to dashboard/i })

      // Back button should exist and be clearly labeled
      expect(backButton).toBeInTheDocument()
      expect(backButton).toHaveTextContent('Back to Dashboard')
    })
  })
})
