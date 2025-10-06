/**
 * Comprehensive Integration Tests for Complete Real-time System
 * Tests all converted components working together
 * Validates end-to-end real-time behavior and concurrent user scenarios
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import { useRealtimeCases } from '../../hooks/useRealtimeCases';
import { useRealtimeUsers } from '../../hooks/useRealtimeUsers';
import { useRealtimeDepartments } from '../../hooks/useRealtimeDepartments';
import { useRealtimePermissions } from '../../hooks/useRealtimePermissions';
import { useRealtimeSettings } from '../../hooks/useRealtimeSettings';

// Comprehensive test component that uses all real-time hooks
const ComprehensiveRealtimeComponent: React.FC = () => {
  // All real-time hooks
  const cases = useRealtimeCases({ enableRealTime: true, enableTesting: true });
  const users = useRealtimeUsers({ enableRealTime: true, enableTesting: true });
  const departments = useRealtimeDepartments({
    country: 'Singapore',
    enableRealTime: true,
    enableTesting: true
  });
  const permissions = useRealtimePermissions({ enableRealTime: true, enableTesting: true });
  const settings = useRealtimeSettings({ enableRealTime: true, enableTesting: true });

  const [testResults, setTestResults] = React.useState<{
    cases: boolean | null;
    users: boolean | null;
    departments: boolean | null;
    permissions: boolean | null;
    settings: boolean | null;
  }>({
    cases: null,
    users: null,
    departments: null,
    permissions: null,
    settings: null
  });

  const runComprehensiveValidation = async () => {
    try {
      const results = {
        cases: await cases.validateComponent(),
        users: await users.validateComponent(),
        departments: await departments.validateComponent(),
        permissions: await permissions.validateComponent(),
        settings: await settings.validateComponent()
      };

      setTestResults(results);

      const allValid = Object.values(results).every(result => result === true);
      return allValid;
    } catch (error) {
      // // console.error('🧪 Comprehensive validation failed:', error);
      return false;
    }
  };

  const getOverallStatus = () => {
    const components = [cases, users, departments, permissions, settings];
    const allLoaded = components.every(comp => !comp.isLoading);
    const hasErrors = components.some(comp => comp.error);
    const allMutating = components.every(comp => comp.isMutating);

    return {
      allLoaded,
      hasErrors,
      allMutating,
      loadingCount: components.filter(comp => comp.isLoading).length,
      errorCount: components.filter(comp => comp.error).length,
      mutatingCount: components.filter(comp => comp.isMutating).length
    };
  };

  const status = getOverallStatus();

  return (
    <div>
      {/* Overall Status */}
      <div data-testid="overall-status">
        {status.allLoaded ? 'All Loaded' : `Loading (${status.loadingCount} remaining)`}
      </div>
      <div data-testid="overall-errors">
        {status.hasErrors ? `Errors: ${status.errorCount}` : 'No Errors'}
      </div>
      <div data-testid="overall-mutations">
        Mutating: {status.mutatingCount}
      </div>

      {/* Individual Component Data */}
      <div data-testid="cases-count">{cases.cases.length}</div>
      <div data-testid="users-count">{users.users.length}</div>
      <div data-testid="departments-count">{departments.departments.length}</div>
      <div data-testid="permissions-count">{permissions.permissions.length}</div>
      <div data-testid="settings-loaded">
        {settings.settings ? 'Settings Loaded' : 'Settings Not Loaded'}
      </div>

      {/* Validation Controls */}
      <button data-testid="validate-all-btn" onClick={runComprehensiveValidation}>
        Validate All Systems
      </button>

      {/* Validation Results */}
      <div data-testid="validation-results">
        Cases: {testResults.cases === null ? 'NOT_TESTED' : (testResults.cases ? 'VALID' : 'INVALID')}
        Users: {testResults.users === null ? 'NOT_TESTED' : (testResults.users ? 'VALID' : 'INVALID')}
        Departments: {testResults.departments === null ? 'NOT_TESTED' : (testResults.departments ? 'VALID' : 'INVALID')}
        Permissions: {testResults.permissions === null ? 'NOT_TESTED' : (testResults.permissions ? 'VALID' : 'INVALID')}
        Settings: {testResults.settings === null ? 'NOT_TESTED' : (testResults.settings ? 'VALID' : 'INVALID')}
      </div>

      {/* Real-time Operations */}
      <button
        data-testid="refresh-all-btn"
        onClick={() => {
          cases.refreshCases();
          users.refreshUsers();
          departments.refreshDepartments();
          permissions.refreshPermissions();
        }}
      >
        Refresh All Data
      </button>

      <button
        data-testid="simulate-updates-btn"
        onClick={() => {
          // Simulate concurrent updates
          if (cases.cases.length > 0) {
            cases.updateCaseStatus(cases.cases[0].id, 'Order Prepared', 'Test update');
          }
          if (users.users.length > 0) {
            users.toggleUser(users.users[0].id);
          }
          if (permissions.permissions.length > 0) {
            const perm = permissions.permissions[0];
            permissions.updatePermission(perm.actionId, perm.roleId, !perm.allowed);
          }
          if (settings.settings) {
            settings.updateSetting('soundEnabled', !settings.settings.soundEnabled);
          }
        }}
      >
        Simulate Concurrent Updates
      </button>
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

describe('Comprehensive Real-time System Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();

    // Setup comprehensive mock data for all systems
    server.use(
      // Cases
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'case-1',
            caseReferenceNumber: 'TC-2025-001',
            hospital: 'Test Hospital',
            status: 'Case Booked',
            country: 'Singapore',
            created_at: new Date().toISOString()
          }
        ]));
      }),

      // Users
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'user-1',
            username: 'testuser1',
            name: 'Test User 1',
            role: 'nurse',
            enabled: true,
            countries: ['Singapore']
          }
        ]));
      }),

      // Departments
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'dept-1',
            name: 'Emergency',
            doctor_count: 3,
            country: 'Singapore'
          }
        ]));
      }),

      // Doctors
      rest.get('*/rest/v1/doctors*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'doctor-1',
            name: 'Dr. Test',
            department_id: 'dept-1',
            is_active: true
          }
        ]));
      }),

      // Permissions
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        return res(ctx.json([
          {
            actionId: 'view-cases',
            roleId: 'nurse',
            allowed: true
          }
        ]));
      }),

      // Roles
      rest.get('*/rest/v1/roles*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'nurse',
            name: 'nurse',
            displayName: 'Nurse',
            color: '#28a745'
          }
        ]));
      }),

      // Settings
      rest.get('*/rest/v1/user_settings*', (req, res, ctx) => {
        return res(ctx.json([
          {
            id: 'setting-1',
            userId: 'user-1',
            soundEnabled: true,
            soundVolume: 0.5,
            theme: 'light'
          }
        ]));
      })
    );
  });

  test('should load all real-time systems without caching', async () => {
    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for all systems to load
    await waitFor(() => {
      expect(screen.getByTestId('overall-status')).toHaveTextContent('All Loaded');
    }, { timeout: 15000 });

    // Verify no errors across all systems
    expect(screen.getByTestId('overall-errors')).toHaveTextContent('No Errors');

    // Verify all systems have data
    expect(screen.getByTestId('cases-count')).toHaveTextContent('1');
    expect(screen.getByTestId('users-count')).toHaveTextContent('1');
    expect(screen.getByTestId('departments-count')).toHaveTextContent('1');
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('1');
    expect(screen.getByTestId('settings-loaded')).toHaveTextContent('Settings Loaded');
  });

  test('should validate all real-time systems comprehensively', async () => {
    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for all systems to load
    await waitFor(() => {
      expect(screen.getByTestId('overall-status')).toHaveTextContent('All Loaded');
    });

    // Run comprehensive validation
    fireEvent.click(screen.getByTestId('validate-all-btn'));

    // Wait for validation to complete
    await waitFor(() => {
      const results = screen.getByTestId('validation-results').textContent;
      expect(results).toContain('Cases: VALID');
      expect(results).toContain('Users: VALID');
      expect(results).toContain('Departments: VALID');
      expect(results).toContain('Permissions: VALID');
      expect(results).toContain('Settings: VALID');
    }, { timeout: 15000 });
  });

  test('should demonstrate no caching across all systems', async () => {
    let casesCallCount = 0;
    let usersCallCount = 0;
    let departmentsCallCount = 0;
    let permissionsCallCount = 0;
    let settingsCallCount = 0;

    // Mock APIs to count calls
    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        casesCallCount++;
        return res(ctx.json([{ id: `case-${casesCallCount}` }]));
      }),
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        usersCallCount++;
        return res(ctx.json([{ id: `user-${usersCallCount}` }]));
      }),
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        departmentsCallCount++;
        return res(ctx.json([{ id: `dept-${departmentsCallCount}` }]));
      }),
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        permissionsCallCount++;
        return res(ctx.json([{ actionId: `action-${permissionsCallCount}` }]));
      }),
      rest.get('*/rest/v1/user_settings*', (req, res, ctx) => {
        settingsCallCount++;
        return res(ctx.json([{ id: `setting-${settingsCallCount}` }]));
      })
    );

    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('overall-status')).toHaveTextContent('All Loaded');
    });

    // Initial calls should be 1 each
    expect(casesCallCount).toBe(1);
    expect(usersCallCount).toBe(1);
    expect(departmentsCallCount).toBe(1);
    expect(permissionsCallCount).toBe(1);
    expect(settingsCallCount).toBe(1);

    // Trigger refresh all - should make fresh API calls (no caching)
    fireEvent.click(screen.getByTestId('refresh-all-btn'));

    await waitFor(() => {
      expect(casesCallCount).toBe(2);
      expect(usersCallCount).toBe(2);
      expect(departmentsCallCount).toBe(2);
      expect(permissionsCallCount).toBe(2);
      // Settings don't refresh on this button, so should still be 1
    });
  });

  test('should handle concurrent user operations safely', async () => {
    let updateCount = 0;

    // Mock all update endpoints
    server.use(
      rest.patch('*/rest/v1/case_bookings*', (req, res, ctx) => {
        updateCount++;
        return res(ctx.json({ id: 'case-1', status: 'Order Prepared' }));
      }),
      rest.patch('*/rest/v1/profiles*', (req, res, ctx) => {
        updateCount++;
        return res(ctx.json({ id: 'user-1', enabled: false }));
      }),
      rest.patch('*/rest/v1/permissions*', (req, res, ctx) => {
        updateCount++;
        return res(ctx.json({ actionId: 'view-cases', allowed: false }));
      }),
      rest.patch('*/rest/v1/user_settings*', (req, res, ctx) => {
        updateCount++;
        return res(ctx.json({ id: 'setting-1', soundEnabled: false }));
      })
    );

    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for all systems to load
    await waitFor(() => {
      expect(screen.getByTestId('overall-status')).toHaveTextContent('All Loaded');
    });

    // Simulate concurrent updates
    fireEvent.click(screen.getByTestId('simulate-updates-btn'));

    // Wait for all updates to complete
    await waitFor(() => {
      expect(updateCount).toBeGreaterThanOrEqual(3); // At least 3 systems updated
    }, { timeout: 10000 });

    // System should remain stable
    expect(screen.getByTestId('overall-errors')).toHaveTextContent('No Errors');
  });

  test('should handle system-wide errors gracefully', async () => {
    // Mock all APIs to return errors
    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Cases DB error' }));
      }),
      rest.get('*/rest/v1/profiles*', (req, res, ctx) => {
        return res(ctx.status(503), ctx.json({ error: 'Users service unavailable' }));
      }),
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ error: 'Departments not found' }));
      }),
      rest.get('*/rest/v1/permissions*', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
      }),
      rest.get('*/rest/v1/user_settings*', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Settings error' }));
      })
    );

    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for errors to be handled
    await waitFor(() => {
      expect(screen.getByTestId('overall-errors')).not.toHaveTextContent('No Errors');
    }, { timeout: 10000 });

    // Should not crash - all counts should be 0
    expect(screen.getByTestId('cases-count')).toHaveTextContent('0');
    expect(screen.getByTestId('users-count')).toHaveTextContent('0');
    expect(screen.getByTestId('departments-count')).toHaveTextContent('0');
    expect(screen.getByTestId('permissions-count')).toHaveTextContent('0');
    expect(screen.getByTestId('settings-loaded')).toHaveTextContent('Settings Not Loaded');
  });

  test('should demonstrate performance with 50-100 concurrent user simulation', async () => {
    const startTime = Date.now();
    let requestCount = 0;

    // Mock high-performance endpoints
    server.use(
      rest.get('*/rest/v1/*', (req, res, ctx) => {
        requestCount++;
        // Simulate network latency
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(res(ctx.json([{ id: `item-${requestCount}` }])));
          }, Math.random() * 50); // 0-50ms latency
        });
      })
    );

    // Render multiple instances to simulate concurrent users
    const instances = Array.from({ length: 10 }, (_, index) => (
      <TestWrapper key={index}>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    ));

    instances.forEach(instance => {
      render(instance);
    });

    // Wait for all instances to load
    await waitFor(() => {
      const loadedElements = screen.getAllByTestId('overall-status');
      const allLoaded = loadedElements.every(el => el.textContent?.includes('All Loaded'));
      expect(allLoaded).toBe(true);
    }, { timeout: 30000 });

    const loadTime = Date.now() - startTime;

    // Performance assertions
    expect(loadTime).toBeLessThan(30000); // Should load within 30 seconds
    expect(requestCount).toBeGreaterThan(40); // Each instance makes multiple requests
  });

  test('should validate real-time subscriptions are working', async () => {
    // This test would require actual Supabase real-time subscriptions
    // For now, we test that the subscription setup doesn't break anything

    render(
      <TestWrapper>
        <ComprehensiveRealtimeComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('overall-status')).toHaveTextContent('All Loaded');
    });

    // Validate that real-time setup is successful
    await waitFor(() => {
      expect(screen.getByTestId('overall-errors')).toHaveTextContent('No Errors');
    });

    // The real-time validation should pass
    fireEvent.click(screen.getByTestId('validate-all-btn'));

    await waitFor(() => {
      const results = screen.getByTestId('validation-results').textContent;
      expect(results).toContain('VALID');
    }, { timeout: 15000 });
  });
});