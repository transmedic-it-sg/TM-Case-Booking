/**
 * Integration Tests for Real-time Departments System
 * Tests EditSets component with useRealtimeDepartments hook
 * Validates department/doctor management with real-time updates
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, server } from '../setup';
import { rest } from 'msw';
import { useRealtimeDepartments } from '../../hooks/useRealtimeDepartments';
import { RealtimeProvider } from '../../components/RealtimeProvider';

// Test component that uses the real-time departments hook
const TestDepartmentsComponent: React.FC = () => {
  const {
    departments,
    selectedDepartment,
    doctors,
    isLoading,
    error,
    refreshDepartments,
    selectDepartment,
    addDoctor,
    removeDoctor,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimeDepartments({
    country: 'Singapore',
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

  const handleSelectDepartment = () => {
    if (departments.length > 0) {
      selectDepartment(departments[0]);
    }
  };

  const handleAddDoctor = async () => {
    if (selectedDepartment) {
      await addDoctor(selectedDepartment.id, 'Dr. Test Doctor', 'Singapore');
    }
  };

  const handleRemoveDoctor = async () => {
    if (doctors.length > 0) {
      await removeDoctor(doctors[0].id);
    }
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Loaded'}</div>
      <div data-testid="mutating">{isMutating ? 'Mutating' : 'Not Mutating'}</div>
      <div data-testid="error">{error ? (error instanceof Error ? error.message : String(error)) : 'No Error'}</div>
      <div data-testid="departments-count">{departments.length}</div>
      <div data-testid="doctors-count">{doctors.length}</div>
      <div data-testid="selected-department">
        {selectedDepartment ? selectedDepartment.name : 'None'}
      </div>
      <div data-testid="departments-data">{JSON.stringify(departments)}</div>
      <div data-testid="doctors-data">{JSON.stringify(doctors)}</div>

      <button data-testid="refresh-btn" onClick={refreshDepartments}>
        Refresh Departments
      </button>

      <button data-testid="validate-btn" onClick={handleValidation}>
        Validate Component
      </button>

      <button data-testid="select-dept-btn" onClick={handleSelectDepartment}>
        Select Department
      </button>

      <button data-testid="add-doctor-btn" onClick={handleAddDoctor}>
        Add Doctor
      </button>

      <button data-testid="remove-doctor-btn" onClick={handleRemoveDoctor}>
        Remove Doctor
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

describe('Real-time Departments Integration Tests', () => {
  beforeEach(() => {
    // Reset any previous state
    jest.clearAllMocks();

    // Setup default departments response
    server.use(
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              id: 'dept-1',
              name: 'Emergency Department',
              description: 'Emergency medical care',
              doctor_count: 5,
              country: 'Singapore'
            },
            {
              id: 'dept-2',
              name: 'Surgery Department',
              description: 'Surgical procedures',
              doctor_count: 8,
              country: 'Singapore'
            }
          ])
        );
      }),

      rest.get('*/rest/v1/doctors*', (req, res, ctx) => {
        return res(
          ctx.json([
            {
              id: 'doctor-1',
              name: 'Dr. John Smith',
              specialties: ['Emergency Medicine'],
              department_id: 'dept-1',
              is_active: true
            },
            {
              id: 'doctor-2',
              name: 'Dr. Jane Doe',
              specialties: ['General Surgery'],
              department_id: 'dept-1',
              is_active: true
            }
          ])
        );
      })
    );
  });

  test('should load departments from database without caching', async () => {
    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Initially should be loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    }, { timeout: 10000 });

    // Should have departments data
    expect(screen.getByTestId('departments-count')).toHaveTextContent('2');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');

    // Verify the actual department data
    const departmentsData = screen.getByTestId('departments-data').textContent;
    expect(departmentsData).toContain('Emergency Department');
    expect(departmentsData).toContain('Surgery Department');
  });

  test('should validate no caching behavior for departments', async () => {
    let callCount = 0;

    // Mock API to count calls
    server.use(
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        callCount++;
        return res(
          ctx.json([
            {
              id: `dept-${callCount}`,
              name: `Department ${callCount}`,
              description: `Test department ${callCount}`,
              doctor_count: callCount,
              country: 'Singapore'
            }
          ])
        );
      })
    );

    render(
      <TestWrapper>
        <TestDepartmentsComponent />
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
    expect(screen.getByTestId('departments-data')).toHaveTextContent('Department 2');
  });

  test('should handle department selection and load doctors', async () => {
    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Initially no department selected
    expect(screen.getByTestId('selected-department')).toHaveTextContent('None');
    expect(screen.getByTestId('doctors-count')).toHaveTextContent('0');

    // Select a department
    fireEvent.click(screen.getByTestId('select-dept-btn'));

    // Wait for department selection and doctors to load
    await waitFor(() => {
      expect(screen.getByTestId('selected-department')).toHaveTextContent('Emergency Department');
    });

    await waitFor(() => {
      expect(screen.getByTestId('doctors-count')).toHaveTextContent('2');
    });

    // Verify doctor data
    const doctorsData = screen.getByTestId('doctors-data').textContent;
    expect(doctorsData).toContain('Dr. John Smith');
    expect(doctorsData).toContain('Dr. Jane Doe');
  });

  test('should validate component functionality', async () => {
    render(
      <TestWrapper>
        <TestDepartmentsComponent />
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
    expect(testReport).toContain('useRealtimeDepartments');
  });

  test('should handle doctor mutations correctly', async () => {
    let addCalled = false;
    let removeCalled = false;

    // Mock mutation endpoints
    server.use(
      rest.post('*/rest/v1/doctors*', (req, res, ctx) => {
        addCalled = true;
        return res(
          ctx.json({
            id: 'new-doctor-id',
            name: 'Dr. Test Doctor',
            specialties: [],
            department_id: 'dept-1',
            is_active: true,
            created_at: new Date().toISOString()
          })
        );
      }),

      rest.delete('*/rest/v1/doctors*', (req, res, ctx) => {
        removeCalled = true;
        return res(ctx.status(204));
      })
    );

    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Wait for initial load and select department
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    fireEvent.click(screen.getByTestId('select-dept-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doctors-count')).toHaveTextContent('2');
    });

    // Test add doctor
    fireEvent.click(screen.getByTestId('add-doctor-btn'));

    await waitFor(() => {
      expect(addCalled).toBe(true);
    });

    // Test remove doctor
    fireEvent.click(screen.getByTestId('remove-doctor-btn'));

    await waitFor(() => {
      expect(removeCalled).toBe(true);
    });
  });

  test('should handle errors gracefully', async () => {
    // Mock API to return error
    server.use(
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ error: 'Database connection failed' })
        );
      })
    );

    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Wait for error to be handled
    await waitFor(() => {
      const errorElement = screen.getByTestId('error');
      expect(errorElement).not.toHaveTextContent('No Error');
    }, { timeout: 10000 });

    // Should not crash the component
    expect(screen.getByTestId('departments-count')).toHaveTextContent('0');
  });

  test('should demonstrate optimistic updates for doctor operations', async () => {
    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Wait for initial load and select department
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    fireEvent.click(screen.getByTestId('select-dept-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('doctors-count')).toHaveTextContent('2');
    });

    // Initially not mutating
    expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');

    // Trigger doctor addition
    fireEvent.click(screen.getByTestId('add-doctor-btn'));

    // Should briefly show mutating state (optimistic update)
    expect(screen.getByTestId('mutating')).toHaveTextContent('Mutating');

    // Wait for mutation to complete
    await waitFor(() => {
      expect(screen.getByTestId('mutating')).toHaveTextContent('Not Mutating');
    }, { timeout: 5000 });
  });

  test('should filter departments by country', async () => {
    // Mock different countries
    server.use(
      rest.get('*/rest/v1/departments*', (req, res, ctx) => {
        const country = req.url.searchParams.get('country') || 'Singapore';

        if (country === 'Singapore') {
          return res(
            ctx.json([
              {
                id: 'sg-dept-1',
                name: 'Singapore Emergency',
                description: 'SG Emergency',
                doctor_count: 3,
                country: 'Singapore'
              }
            ])
          );
        } else {
          return res(
            ctx.json([
              {
                id: 'my-dept-1',
                name: 'Malaysia Emergency',
                description: 'MY Emergency',
                doctor_count: 2,
                country: 'Malaysia'
              }
            ])
          );
        }
      })
    );

    render(
      <TestWrapper>
        <TestDepartmentsComponent />
      </TestWrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Loaded');
    });

    // Should only show Singapore departments
    const departmentsData = screen.getByTestId('departments-data').textContent;
    expect(departmentsData).toContain('Singapore Emergency');
    expect(departmentsData).not.toContain('Malaysia Emergency');
  });
});