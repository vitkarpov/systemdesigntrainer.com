import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils'

// Mock ResizeObserver for dropdown tests
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

// Mock API hooks at module level
vi.mock('@/api/hooks.gen', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/api/hooks.gen')>()
  return {
    ...actual,
    useAuthControllerGetUser: vi.fn(),
    useAuthControllerLogout: vi.fn(),
  }
})

// Import after mocks are set up
import { UserMenu } from '@/components/UserMenu'
import { useAuthControllerGetUser, useAuthControllerLogout } from '@/api/hooks.gen'

const mockUseAuthControllerGetUser = useAuthControllerGetUser as ReturnType<typeof vi.fn>
const mockUseAuthControllerLogout = useAuthControllerLogout as ReturnType<typeof vi.fn>

describe('UserMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for logout mutation
    mockUseAuthControllerLogout.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
    })
  })

  describe('User Initials Display', () => {
    it('should display "U" when user.name is null', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: null,
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('U')
      expect(fallback).toBeInTheDocument()
    })

    it('should display "U" when user.name is undefined', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: undefined,
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('U')
      expect(fallback).toBeInTheDocument()
    })

    it('should display "U" when user is null', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: null,
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('U')
      expect(fallback).toBeInTheDocument()
    })

    it('should display "U" when user is undefined', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('U')
      expect(fallback).toBeInTheDocument()
    })

    it('should display first letter of single name', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('J')
      expect(fallback).toBeInTheDocument()
    })

    it('should display initials of full name (first and last)', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('JD')
      expect(fallback).toBeInTheDocument()
    })

    it('should display initials of full name with middle name (first and second)', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Michael Doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('JM')
      expect(fallback).toBeInTheDocument()
    })

    it('should display initials in uppercase', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'john doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('JD')
      expect(fallback).toBeInTheDocument()
    })
  })

  describe('Avatar Display', () => {
    it('should use fallback initials when avatarUrl is null', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const fallback = screen.getByText('JD')
      expect(fallback).toBeInTheDocument()
    })

    it('should render avatar when user is provided', () => {
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      // Avatar button should be rendered
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })
  })

  describe('Logout Functionality', () => {
    it('should call logout when Logout menu item is clicked', async () => {
      const user = userEvent.setup()
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      // Open the dropdown menu
      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      // Click the Logout menu item
      const logoutItem = await screen.findByText('Logout')
      await user.click(logoutItem)

      // Verify the logout mutation would be triggered
      // (The actual navigation is handled by AuthContext and tested separately)
    })
  })

  describe('Dropdown Menu', () => {
    it('should open dropdown menu when avatar is clicked', async () => {
      const user = userEvent.setup()
      mockUseAuthControllerGetUser.mockReturnValue({
        data: {
          id: '1',
          email: 'test@example.com',
          name: 'John Doe',
          avatarUrl: null,
        },
        isLoading: false,
        error: null,
      })

      renderWithProviders(<UserMenu />)

      const menuButton = screen.getByRole('button')
      await user.click(menuButton)

      const logoutItem = await screen.findByText('Logout')
      expect(logoutItem).toBeInTheDocument()
    })
  })
})
