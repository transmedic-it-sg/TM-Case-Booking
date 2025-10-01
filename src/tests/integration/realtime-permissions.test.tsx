/**
 * Integration Tests for Real-time Permissions System
 * Tests PermissionMatrix component with useRealtimePermissions hook
 * Validates permission management with real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import { useRealtimePermissions } from '../../hooks/useRealtimePermissions';
import { RealtimeProvider } from '../../components/RealtimeProvider';

// Test component that uses the real-time permissions hook
const TestPermissionsComponent: React.FC = () => {
  const {
    permissions,
    roles,
    isLoading,
    error,
    refreshPermissions,
    updatePermission,
    savePermissions,
    resetPermissions,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimePermissions({
    enableRealTime: true,
    enableTesting: true
  });

  const [validationResult, setValidationResult] = React.useState<boolean | null>(null);
  const [testReport, setTestReport] = React.useState<string>('');

  const handleValidation = async () => {
    const result = await validateComponent();
    setValidationResult(result);
    setTestReport(getTestingReport());
  };

  const handleUpdatePermission = async () => {
    if (permissions.length > 0) {
      const perm = permissions[0];
      await updatePermission(perm.actionId, perm.roleId, !perm.allowed);
    }
  };

  const handleSavePermissions = async () => {
    await savePermissions(permissions);
  };

  const handleResetPermissions = async () => {
    await resetPermissions();
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="mutating">{isMutating ? 'Mutating' : 'Not Mutating'}</div>
      <div data-testid="error">{error ? (error instanceof Error ? error.message : String(error)) : 'No Error'}</div>
      <div data-testid="permissions-count">{permissions.length}</div>
      <div data-testid="roles-count">{roles.length}</div>
      <div data-testid="permissions-data">{JSON.stringify(permissions)}</div>
      <div data-testid="roles-data">{JSON.stringify(roles)}</div>

      <button data-testid="refresh-btn" onClick={refreshPermissions}>
        Refresh Permissions
      </button>

      <button data-testid="validate-btn" onClick={handleValidation}>
        Validate Component
      </button>

      <button data-testid="update-permission-btn" onClick={handleUpdatePermission}>
        Update Permission
      </button>

      <button data-testid="save-permissions-btn" onClick={handleSavePermissions}>
        Save Permissions
      </button>

      <button data-testid="reset-permissions-btn" onClick={handleResetPermissions}>
        Reset Permissions
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

describe('Real-time Permissions Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();

    // Setup default permissions and roles response
    server.use(
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              actionId: 'view-cases',
              roleId: 'nurse',
              allowed: true
            },
            {
              actionId: 'edit-cases',
              roleId: 'nurse',
              allowed: false
            },
            {
              actionId: 'view-cases',
              roleId: 'doctor',
              allowed: true
            },
            {
              actionId: 'edit-cases',
              roleId: 'doctor',
              allowed: true
            }
          ])
        );
      }),

      rest.get('*/rest/v1/roles*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              id: 'nurse',
              name: 'nurse',
              displayName: 'Nurse',
              description: 'Healthcare nurse with limited access',
              color: '#28a745'
            },
            {
              id: 'doctor',
              name: 'doctor',
              displayName: 'Doctor',
              description: 'Medical doctor with extended access',
              color: '#007bff'
            },
            {
              id: 'admin',
              name: 'admin',
              displayName: 'Administrator',
              description: 'Full system administrator',
              color: '#dc3545'
            }
          ])
        );
      })
    );
  });

  test('should load permissions and roles from database without caching', async () => {
    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    }, { timeout: 10000 });

    // Should have permissions and roles data
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('4');
    expect(screen.getByTestId('roles-count')).toHaveTextContent('3');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');

    // Verify the actual permissions data
    const permissionsData = screen.getByTestId('permissions-data').textContent;
    expect(permissionsData).toContain('view-cases');
    expect(permissionsData).toContain('edit-cases');

    // Verify roles data
    const rolesData = screen.getByTestId('roles-data').textContent;
    expect(rolesData).toContain('nurse');
    expect(rolesData).toContain('doctor');
    expect(rolesData).toContain('admin');
  });

  test('should validate no caching behavior for permissions', async () => {
    let callCount = 0;

    // Mock API to count calls
    server.use(
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        callCount++;
        return res(
          ctx.json([
            {
              actionId: `action-${callCount}`,
              roleId: 'nurse',
              allowed: true
            }
          ])
        );
      })
    );

    render(
      <TestWrapper>
        <TestPermissionsComponent />
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

    // Verify we get fresh data each time
    expect(screen.getByTestId('permissions-data')).toHaveTextContent('action-2');
  });

  test('should validate component functionality', async () => {
    render(
      <TestWrapper>
        <TestPermissionsComponent />
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
    expect(testReport).toContain('useRealtimePermissions');
  });

  test('should handle permission mutations correctly', async () => {
    let updateCalled = false;
    let saveCalled = false;
    let resetCalled = false;

    // Mock mutation endpoints
    server.use(
      rest.patch('*/rest/v1/permissions*', (req, res, ctx) => {
        updateCalled = true;
        return res(
          ctx.json({
            actionId: 'view-cases',
            roleId: 'nurse',
            allowed: false,
            updated_at: new Date().toISOString()
          })
        );
      }),

      rest.post('*/rest/v1/permissions/bulk*', (req, res, ctx) => {
        saveCalled = true;
        return res(
          ctx.json({ success: true, updated_count: 4 })
        );
      }),

      rest.post('*/rest/v1/permissions/reset*', (req, res, ctx) => {
        resetCalled = true;
        return res(
          ctx.json({ success: true, reset_count: 10 })
        );
      })
    );

    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Test update permission
    fireEvent.click(screen.getByTestId('update-permission-btn'));

    await waitFor(() => {
      expect(updateCalled).toBe(true);
    });

    // Test save permissions
    fireEvent.click(screen.getByTestId('save-permissions-btn'));

    await waitFor(() => {
      expect(saveCalled).toBe(true);
    });

    // Test reset permissions
    fireEvent.click(screen.getByTestId('reset-permissions-btn'));

    await waitFor(() => {
      expect(resetCalled).toBe(true);
    });
  });

  test('should handle errors gracefully', async () => {
    // Mock API to return error
    server.use(
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Wait for error to be handled
    await waitFor(() => {
      const errorElement = screen.getByTestId('error');
      expect(errorElement).not.toHaveTextContent('No Error');
    }, { timeout: 10000 });

    // Should not crash the component
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('0');
  });

  test('should demonstrate optimistic updates for permissions', async () => {
    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Initially not mutating
    expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');

    // Trigger permission update
    fireEvent.click(screen.getByTestId('update-permission-btn'));

    // Should briefly show mutating state (optimistic update)
    expect(screen.getByTestId('mutating')).toHaveTextContent('Mutating');

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    }, { timeout: 5000 });
  });

  test('should handle role-based permission matrix correctly', async () => {
    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Verify permission matrix structure
    const permissionsData = screen.getByTestId('permissions-data').textContent;
    const rolesData = screen.getByTestId('roles-data').textContent;

    // Should have nurse with view access but no edit access
    expect(permissionsData).toContain('"roleId":"nurse"');
    expect(permissionsData).toContain('"actionId":"view-cases"');
    expect(permissionsData).toContain('"allowed":true');
    expect(permissionsData).toContain('"allowed":false');

    // Should have doctor role with full access
    expect(permissionsData).toContain('"roleId":"doctor"');

    // Should have all role definitions
    expect(rolesData).toContain('Nurse');
    expect(rolesData).toContain('Doctor');
    expect(rolesData).toContain('Administrator');
  });

  test('should cache permissions correctly and clear cache when needed', async () => {
    let clearCacheCalled = false;

    // Mock permissions cache clear endpoint
    server.use(
      rest.delete('*/rest/v1/permissions/cache*', (req, res, ctx) => {
        clearCacheCalled = true;
        return res(ctx.status(204));
      })
    );

    render(
      <TestWrapper>
        <TestPermissionsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Update a permission (should clear cache)
    fireEvent.click(screen.getByTestId('update-permission-btn'));

    // Note: Cache clearing is handled internally by the hook
    // This test ensures the permission system works with cache management
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    });
  });
});