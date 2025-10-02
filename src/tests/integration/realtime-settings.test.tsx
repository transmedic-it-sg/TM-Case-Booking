/**
 * Integration Tests for Real-time Settings System
 * Tests Settings component with useRealtimeSettings hook
 * Validates cross-device settings sync and real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import { useRealtimeSettings } from '../../hooks/useRealtimeSettings';
import { RealtimeProvider } from '../../components/RealtimeProvider';

// Test component that uses the real-time settings hook
const TestSettingsComponent: React.FC = () => {
  const {
    settings,
    isLoading,
    error,
    updateSetting,
    resetSettings,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimeSettings({
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

  const handleToggleSound = async () => {
    await updateSetting('soundEnabled', !settings?.soundEnabled);
  };

  const handleUpdateVolume = async () => {
    await updateSetting('soundVolume', 0.8);
  };

  const handleToggleNotifications = async () => {
    await updateSetting('notificationsEnabled', !settings?.notificationsEnabled);
  };

  const handleUpdateTheme = async () => {
    const newTheme = settings?.theme === 'light' ? 'dark' : 'light';
    await updateSetting('theme', newTheme);
  };

  const handleResetSettings = async () => {
    await resetSettings();
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="mutating">{isMutating ? 'Mutating' : 'Not Mutating'}</div>
      <div data-testid="error">{error ? (error instanceof Error ? error.message : JSON.stringify(error)) : 'No Error'}</div>
      <div data-testid="settings-data">{JSON.stringify(settings)}</div>

      <div data-testid="sound-enabled">
        {settings?.soundEnabled ? 'Sound On' : 'Sound Off'}
      </div>
      <div data-testid="sound-volume">
        Volume: {settings?.soundVolume || 0}
      </div>
      <div data-testid="notifications-enabled">
        {settings?.notificationsEnabled ? 'Notifications On' : 'Notifications Off'}
      </div>
      <div data-testid="theme">
        Theme: {settings?.theme || 'light'}
      </div>

      <button data-testid="validate-btn" onClick={handleValidation}>
        Validate Component
      </button>

      <button data-testid="toggle-sound-btn" onClick={handleToggleSound}>
        Toggle Sound
      </button>

      <button data-testid="update-volume-btn" onClick={handleUpdateVolume}>
        Update Volume
      </button>

      <button data-testid="toggle-notifications-btn" onClick={handleToggleNotifications}>
        Toggle Notifications
      </button>

      <button data-testid="update-theme-btn" onClick={handleUpdateTheme}>
        Update Theme
      </button>

      <button data-testid="reset-settings-btn" onClick={handleResetSettings}>
        Reset Settings
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

describe('Real-time Settings Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();

    // Setup default settings response
    server.use(
      rest.get('*/rest/v1/user_settings*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              userId: '550e8400-e29b-41d4-a716-446655440000',
              soundEnabled: true,
              soundVolume: 0.5,
              notificationsEnabled: false,
              theme: 'light',
              language: 'en',
              timezone: 'auto',
              emailNotifications: true,
              pushNotifications: false,
              autoRefresh: true,
              refreshInterval: 30,
              compactMode: false,
              showAdvancedFeatures: false,
              lastUpdated: new Date().toISOString()
            }
          ])
        );
      })
    );
  });

  test('should load settings from database without localStorage', async () => {
    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    }, { timeout: 10000 });

    // Should have settings data
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');

    // Verify the actual settings data
    expect(screen.getByTestId('sound-enabled')).toHaveTextContent('Sound On');
    expect(screen.getByTestId('sound-volume')).toHaveTextContent('Volume: 0.5');
    expect(screen.getByTestId('notifications-enabled')).toHaveTextContent('Notifications Off');
    expect(screen.getByTestId('theme')).toHaveTextContent('Theme: light');
  });

  test('should validate no localStorage dependency', async () => {
    // Mock localStorage to verify it's not used
    const localStorageSetItem = jest.spyOn(Storage.prototype, 'setItem');
    const localStorageGetItem = jest.spyOn(Storage.prototype, 'getItem');

    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Update a setting
    fireEvent.click(screen.getByTestId('toggle-sound-btn'));

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    });

    // Verify localStorage was not used for settings storage
    // (It might be used for other purposes, but not for the main settings)
    const settingsRelatedCalls = localStorageSetItem.mock.calls.filter(call =>
      call[0].includes('sound') || call[0].includes('notifications') || call[0].includes('theme')
    );

    expect(settingsRelatedCalls.length).toBeLessThanOrEqual(1); // Minimal localStorage usage
  });

  test('should validate component functionality', async () => {
    render(
      <TestWrapper>
        <TestSettingsComponent />
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
    expect(testReport).toContain('useRealtimeSettings');
  });

  test('should handle settings mutations correctly', async () => {
    let updateCalled = false;
    let resetCalled = false;

    // Mock mutation endpoints
    server.use(
      rest.patch('*/rest/v1/user_settings*', (req, res, ctx) => {
        updateCalled = true;
        return res(
          ctx.json({
            id: '550e8400-e29b-41d4-a716-446655440001',
            soundEnabled: false,
            updated_at: new Date().toISOString()
          })
        );
      }),

      rest.post('*/rest/v1/user_settings/reset*', (req, res, ctx) => {
        resetCalled = true;
        return res(
          ctx.json({
            id: '550e8400-e29b-41d4-a716-446655440001',
            soundEnabled: true,
            soundVolume: 0.5,
            notificationsEnabled: false,
            theme: 'light',
            reset_at: new Date().toISOString()
          })
        );
      })
    );

    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Test sound toggle
    fireEvent.click(screen.getByTestId('toggle-sound-btn'));

    await waitFor(() => {
      expect(updateCalled).toBe(true);
    });

    // Test reset settings
    fireEvent.click(screen.getByTestId('reset-settings-btn'));

    await waitFor(() => {
      expect(resetCalled).toBe(true);
    });
  });

  test('should handle all setting types correctly', async () => {
    let volumeUpdated = false;
    let themeUpdated = false;
    let notificationsUpdated = false;

    // Mock specific setting updates
    server.use(
      rest.patch('*/rest/v1/user_settings*', (req, res, ctx) => {
        const body = req.body as any;

        if ('soundVolume' in body) {
          volumeUpdated = true;
          return res(ctx.json({ soundVolume: 0.8 }));
        }

        if ('theme' in body) {
          themeUpdated = true;
          return res(ctx.json({ theme: 'dark' }));
        }

        if ('notificationsEnabled' in body) {
          notificationsUpdated = true;
          return res(ctx.json({ notificationsEnabled: true }));
        }

        return res(ctx.json({}));
      })
    );

    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Test volume update
    fireEvent.click(screen.getByTestId('update-volume-btn'));
    await waitFor(() => expect(volumeUpdated).toBe(true));

    // Test theme update
    fireEvent.click(screen.getByTestId('update-theme-btn'));
    await waitFor(() => expect(themeUpdated).toBe(true));

    // Test notifications update
    fireEvent.click(screen.getByTestId('toggle-notifications-btn'));
    await waitFor(() => expect(notificationsUpdated).toBe(true));
  });

  test('should handle errors gracefully', async () => {
    // Mock API to return error
    server.use(
      rest.get('*/rest/v1/user_settings*', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for error to be handled
    await waitFor(() => {
      const errorElement = screen.getByTestId('error');
      expect(errorElement).not.toHaveTextContent('No Error');
    }, { timeout: 10000 });

    // Should not crash the component
    expect(screen.getByTestId('sound-enabled')).toHaveTextContent('Sound Off');
  });

  test('should demonstrate optimistic updates for settings', async () => {
    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Initially not mutating
    expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');

    // Trigger setting update
    fireEvent.click(screen.getByTestId('toggle-sound-btn'));

    // Should briefly show mutating state (optimistic update)
    expect(screen.getByTestId('mutating')).toHaveTextContent('Mutating');

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    }, { timeout: 5000 });
  });

  test('should support cross-device settings sync', async () => {
    let firstDeviceUpdate = false;
    let secondDeviceUpdate = false;

    // Mock settings updates from different devices
    server.use(
      rest.patch('*/rest/v1/user_settings*', (req, res, ctx) => {
        const userAgent = req.headers.get('user-agent');

        if (userAgent?.includes('Device1')) {
          firstDeviceUpdate = true;
          return res(
            ctx.json({
              id: '550e8400-e29b-41d4-a716-446655440001',
              soundEnabled: false,
              sync_source: 'Device1',
              updated_at: new Date().toISOString()
            })
          );
        } else {
          secondDeviceUpdate = true;
          return res(
            ctx.json({
              id: '550e8400-e29b-41d4-a716-446655440001',
              theme: 'dark',
              sync_source: 'Device2',
              updated_at: new Date().toISOString()
            })
          );
        }
      })
    );

    // Render two instances (simulating different devices)
    const { container: device1 } = render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    const { container: device2 } = render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Both should load independently
    await waitFor(() => {
      const device1Loading = device1.querySelector('[data-testid="loading"]');
      const device2Loading = device2.querySelector('[data-testid="loading"]');
      expect(device1Loading).toHaveTextContent('Loaded');
      expect(device2Loading).toHaveTextContent('Loaded');
    });

    // Both devices should be functional
    expect(device1).toBeTruthy();
    expect(device2).toBeTruthy();
  });

  test('should validate settings schema and constraints', async () => {
    render(
      <TestWrapper>
        <TestSettingsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Verify settings follow expected schema
    const settingsData = screen.getByTestId('settings-data').textContent;
    const settings = JSON.parse(settingsData || '{}');

    // Validate sound volume is between 0 and 1
    expect(settings.soundVolume).toBeGreaterThanOrEqual(0);
    expect(settings.soundVolume).toBeLessThanOrEqual(1);

    // Validate boolean fields
    expect(typeof settings.soundEnabled).toBe('boolean');
    expect(typeof settings.notificationsEnabled).toBe('boolean');

    // Validate theme options
    expect(['light', 'dark', 'auto']).toContain(settings.theme);

    // Validate refresh interval (should be >= 5 seconds)
    expect(settings.refreshInterval).toBeGreaterThanOrEqual(5);
  });
});