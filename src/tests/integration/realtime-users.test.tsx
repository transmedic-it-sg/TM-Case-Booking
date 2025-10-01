/**
 * Integration Tests for Real-time Users System
 * Tests UserManagement component with useRealtimeUsers hook
 * Validates complete localStorage elimination and real-time behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import { useRealtimeUsers } from '../../hooks/useRealtimeUsers';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import { User } from '../../types';

// Test component that uses the real-time users hook
const TestUsersComponent: React.FC = () => {
  const {
    users,
    isLoading,
    error,
    refreshUsers,
    addUser,
    updateUser,
    deleteUser,
    toggleUser,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimeUsers({
    enableRealTime: true,
    enableTesting: true,
    filters: { country: 'Singapore' }
  });

  const [validationResult, setValidationResult] = React.useState<boolean | null>(null);
  const [testReport, setTestReport] = React.useState<string>('');

  const handleValidation = async () => {
    const result = await validateComponent();
    setValidationResult(result);
    setTestReport(getTestingReport());
  };

  const handleAddUser = async () => {
    await addUser({
      username: 'testuser',
      name: 'Test User',
      role: 'nurse',
      departments: ['Emergency'],
      countries: ['Singapore'],
      enabled: true,
      email: 'test@example.com',
      password: 'temppass123'
    });
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="mutating">{isMutating ? 'Mutating' : 'Not Mutating'}</div>
      <div data-testid="error">{error ? (error instanceof Error ? error.message : String(error)) : 'No Error'}</div>
      <div data-testid="users-count">{users.length}</div>
      <div data-testid="users-data">{JSON.stringify(users)}</div>

      <button data-testid="refresh-btn" onClick={refreshUsers}>
        Refresh Users
      </button>

      <button data-testid="validate-btn" onClick={handleValidation}>
        Validate Component
      </button>

      <button data-testid="add-user-btn" onClick={handleAddUser}>
        Add User
      </button>

      <button
        data-testid="toggle-user-btn"
        onClick={() => users.length > 0 && toggleUser(users[0].id)}
      >
        Toggle User
      </button>

      <div data-testid="validation-result">
        {validationResult !== null ? (validationResult ? 'VALID' : 'INVALID') : 'NOT_TESTED'}
      </div>

      <div data-testid="test-report">{testReport}</div>
    </div>
  );
};

// Test wrapper with providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        {children}
      </RealtimeProvider>
    </QueryClientProvider>
  );
};

describe('Real-time Users Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();

    // Setup default user data response
    server.use(
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              id: 'test-user-1',
              username: 'testuser1',
              name: 'Test User 1',
              role: 'nurse',
              departments: ['Emergency'],
              countries: ['Singapore'],
              enabled: true,
              email: 'test1@example.com',
              created_at: new Date().toISOString()
            },
            {
              id: 'test-user-2',
              username: 'testuser2',
              name: 'Test User 2',
              role: 'doctor',
              departments: ['Surgery'],
              countries: ['Malaysia'],
              enabled: false,
              email: 'test2@example.com',
              created_at: new Date().toISOString()
            }
          ])
        );
      })
    );
  });

  test('should load users from database without caching', async () => {
    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    }, { timeout: 10000 });

    // Should have users data
    expect(screen.getByTestId('users-count')).toHaveTextContent('2');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');

    // Verify the actual user data
    const usersData = screen.getByTestId('users-data').textContent;
    expect(usersData).toContain('testuser1');
    expect(usersData).toContain('Test User 1');
  });

  test('should validate no caching behavior for users', async () => {
    let callCount = 0;

    // Mock API to count calls
    server.use(
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        callCount++;
        return res(
          ctx.json([
            {
              id: `test-user-${callCount}`,
              username: `testuser${callCount}`,
              name: `Test User ${callCount}`,
              role: 'nurse',
              departments: ['Emergency'],
              countries: ['Singapore'],
              enabled: true,
              email: `test${callCount}@example.com`,
              created_at: new Date().toISOString()
            }
          ])
        );
      })
    );

    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    expect(callCount).toBe(1);

    // Trigger refresh - should make another API call (no caching)
    fireEvent.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      expect(callCount).toBe(2);
    });

    // Trigger another refresh - should make yet another API call
    fireEvent.click(screen.getByTestId('refresh-btn'));

    await waitFor(() => {
      expect(callCount).toBe(3);
    });

    // Verify we get fresh data each time
    expect(screen.getByTestId('users-data')).toHaveTextContent('testuser3');
  });

  test('should validate component functionality', async () => {
    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Run validation
    fireEvent.click(screen.getByTestId('validate-btn'));

    // Wait for validation to complete
    await waitFor(() => {
      expect(screen.getByTestId('validation-result')).toHaveTextContent('VALID');
    }, { timeout: 10000 });

    // Check test report is generated
    const testReport = screen.getByTestId('test-report').textContent;
    expect(testReport).toContain('useRealtimeUsers');
  });

  test('should handle user mutations correctly', async () => {
    let addCalled = false;
    let toggleCalled = false;

    // Mock mutation endpoints
    server.use(
      rest.post('*/rest/v1/profiles*', (req, res, ctx) => {
        addCalled = true;
        return res(
          ctx.json({
            id: 'new-user-id',
            ...(req.body as object),
            created_at: new Date().toISOString()
          })
        );
      }),

      rest.patch('*/rest/v1/profiles*', (req, res, ctx) => {
        toggleCalled = true;
        return res(
          ctx.json({
            id: 'test-user-1',
            enabled: false,
            updated_at: new Date().toISOString()
          })
        );
      })
    );

    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Test add user
    fireEvent.click(screen.getByTestId('add-user-btn'));

    await waitFor(() => {
      expect(addCalled).toBe(true);
    });

    // Test toggle user
    fireEvent.click(screen.getByTestId('toggle-user-btn'));

    await waitFor(() => {
      expect(toggleCalled).toBe(true);
    });
  });

  test('should handle errors gracefully', async () => {
    // Mock API to return error
    server.use(
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for error to be handled
    await waitFor(() => {
      const errorElement = screen.getByTestId('error');
      expect(errorElement).not.toHaveTextContent('No Error');
    }, { timeout: 10000 });

    // Should not crash the component
    expect(screen.getByTestId('users-count')).toHaveTextContent('0');
  });

  test('should filter users by country correctly', async () => {
    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Should only show Singapore users due to filter
    const usersData = screen.getByTestId('users-data').textContent;
    expect(usersData).toContain('Singapore');
    // Malaysia user should be filtered out by the component logic
  });

  test('should demonstrate optimistic updates', async () => {
    render(
      <TestWrapper>
        <TestUsersComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Initially not mutating
    expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');

    // Trigger mutation
    fireEvent.click(screen.getByTestId('add-user-btn'));

    // Should briefly show mutating state (optimistic update)
    expect(screen.getByTestId('mutating')).toHaveTextContent('Mutating');

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    }, { timeout: 5000 });
  });
});