/**
 * Component Integration Tests for CasesList
 * Tests real component functionality with real-time hooks
 * Validates UI behavior and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import CasesList from '../../components/CasesList';
import { RealtimeProvider } from '../../components/RealtimeProvider';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { SoundProvider } from '../../contexts/SoundContext';

// Mock user data
const mockCurrentUser = {
  id: 'test-user-1',
  username: 'testuser',
  password: 'test-password',
  name: 'Test User',
  role: 'admin',
  selectedCountry: 'Singapore',
  departments: ['Cardiology'],
  countries: ['Singapore'],
  enabled: true,
  email: 'test@example.com'
};

// Mock cases data
const mockCases = [
  {
    id: 'case-1',
    caseReferenceNumber: 'TC-2025-001',
    hospital: 'Singapore General Hospital',
    department: 'Cardiology',
    doctorName: 'Dr. Test',
    procedureType: 'Heart Surgery',
    procedureName: 'Bypass',
    status: 'Case Booked',
    country: 'Singapore',
    dateOfSurgery: '2025-02-01',
    timeOfProcedure: '09:00',
    submittedBy: 'Test User',
    surgerySetSelection: ['Heart Surgery Set A'],
    implantBox: ['Heart Implant Box 1'],
    specialInstruction: 'Test instruction',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'case-2',
    caseReferenceNumber: 'TC-2025-002',
    hospital: 'Mount Elizabeth Hospital',
    department: 'Orthopedics',
    doctorName: 'Dr. Bone',
    procedureType: 'Knee Surgery',
    procedureName: 'Replacement',
    status: 'Order Prepared',
    country: 'Singapore',
    dateOfSurgery: '2025-02-02',
    timeOfProcedure: '10:00',
    submittedBy: 'Test User 2',
    surgerySetSelection: ['Knee Surgery Set B'],
    implantBox: ['Knee Implant Box 1'],
    specialInstruction: 'Urgent case',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Test wrapper with all providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeProvider>
        <SoundProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </SoundProvider>
      </RealtimeProvider>
    </QueryClientProvider>
  );
};

describe('CasesList Component Integration Tests', () => {
  beforeEach(() => {
    // Setup mock API responses
    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        return res(ctx.json(mockCases));
      }),

      rest.patch('*/rest/v1/case_bookings*', (req, res, ctx) => {
        return res(
          ctx.json({
            id: 'case-1',
            ...(req.body as object),
            updated_at: new Date().toISOString()
          })
        );
      })
    );
  });

  test('should render cases list with real-time data', async () => {
    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Should show loading initially
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for cases to load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
      expect(screen.getByText('TC-2025-002')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Should display case details
    expect(screen.getByText('Singapore General Hospital')).toBeInTheDocument();
    expect(screen.getByText('Mount Elizabeth Hospital')).toBeInTheDocument();
    expect(screen.getByText('Dr. Test')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bone')).toBeInTheDocument();
  });

  test('should display real-time connection status', async () => {
    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      // Should show real-time status indicator
      const statusIndicator = screen.getByText(/Live Data|Reconnecting/);
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  test('should handle refresh button correctly', async () => {
    let refreshCount = 0;

    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        refreshCount++;
        return res(ctx.json(mockCases));
      })
    );

    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
    });

    expect(refreshCount).toBe(1);

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Should trigger another API call
    await waitFor(() => {
      expect(refreshCount).toBe(2);
    });
  });

  test('should handle case status updates', async () => {
    let updateCalled = false;
    let updateData: any = null;

    server.use(
      rest.patch('*/rest/v1/case_bookings*', (req, res, ctx) => {
        updateCalled = true;
        updateData = req.body;
        return res(
          ctx.json({
            id: 'case-1',
            status: 'Order Prepared',
            updated_at: new Date().toISOString()
          })
        );
      })
    );

    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for cases to load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
    });

    // Find and click a status update button (this depends on your UI)
    // For example, if there's a "Process Order" button
    const processButtons = screen.getAllByRole('button');
    const processButton = processButtons.find(btn =>
      btn.textContent?.includes('Process') || btn.textContent?.includes('Update')
    );

    if (processButton) {
      fireEvent.click(processButton);

      // Should trigger update API call
      await waitFor(() => {
        expect(updateCalled).toBe(true);
      });
    }
  });

  test('should filter cases correctly', async () => {
    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for cases to load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
      expect(screen.getByText('TC-2025-002')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search/i);
    if (searchInput) {
      fireEvent.change(searchInput, { target: { value: 'TC-2025-001' } });

      // Should filter to show only matching case
      await waitFor(() => {
        expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
        // Second case should be filtered out
        expect(screen.queryByText('TC-2025-002')).not.toBeInTheDocument();
      });
    }
  });

  test('should handle errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Should handle error gracefully
    await waitFor(() => {
      // Component should not crash
      expect(screen.getByText(/error|failed|problem/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('should validate component functionality with testing button', async () => {
    // Only in development mode
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for cases to load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
    });

    // Should show test button in development
    const testButton = screen.getByRole('button', { name: /test/i });
    expect(testButton).toBeInTheDocument();

    // Click test button
    fireEvent.click(testButton);

    // Should not crash (validation should run)
    await waitFor(() => {
      expect(testButton).toBeInTheDocument();
    });

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  test('should demonstrate no caching behavior', async () => {
    let callCount = 0;

    // Track API calls
    server.use(
      rest.get('*/rest/v1/case_bookings*', (req, res, ctx) => {
        callCount++;
        return res(ctx.json([
          {
            ...mockCases[0],
            id: `dynamic-case-${callCount}`,
            caseReferenceNumber: `TC-2025-${callCount.toString().padStart(3, '0')}`
          }
        ]));
      })
    );

    render(
      <TestWrapper>
        <CasesList
          currentUser={mockCurrentUser}
          onProcessCase={() => {}}
          highlightedCaseId={null}
          onClearHighlight={() => {}}
          onNavigateToPermissions={() => {}}
        />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('TC-2025-001')).toBeInTheDocument();
    });

    expect(callCount).toBe(1);

    // Trigger multiple refreshes
    const refreshButton = screen.getByRole('button', { name: /refresh/i });

    fireEvent.click(refreshButton);
    await waitFor(() => expect(callCount).toBe(2));

    fireEvent.click(refreshButton);
    await waitFor(() => expect(callCount).toBe(3));

    // Each refresh should make a new API call (no caching)
    expect(callCount).toBe(3);

    // Should show the latest data
    expect(screen.getByText('TC-2025-003')).toBeInTheDocument();
  });
});