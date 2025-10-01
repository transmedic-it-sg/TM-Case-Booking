import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CaseBooking, CaseStatus } from '../types';
import { useRealtimeCases } from '../hooks/useRealtimeCases';
import { getCurrentUser } from '../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getStatusColor } from './CasesList/utils';
import { formatDate } from '../utils/dateFormat';
import { useUserNames } from '../hooks/useUserNames';
import FilterDatePicker from './FilterDatePicker';
import SearchableDropdown from './SearchableDropdown';
import dynamicConstantsService from '../services/dynamicConstantsService';
import '../assets/components/Reports.css';

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  status: CaseStatus | '';
  country: string;
  department: string;
  submitter: string;
  reportType: 'overview' | 'workflow' | 'performance' | 'detailed';
}

interface ReportData {
  totalCases: number;
  statusBreakdown: Record<CaseStatus, number>;
  countryBreakdown: Record<string, number>;
  departmentBreakdown: Record<string, number>;
  monthlyTrends: Record<string, number>;
  topSubmitters: Array<{ name: string; count: number }>;
  averageProcessingTime: number;
  urgentCases: number;
  completionRate: number;
}

const Reports: React.FC = () => {
  const { cases } = useRealtimeCases({ enableRealTime: true });
  const [filteredCases, setFilteredCases] = useState<CaseBooking[]>([]);
  const [currentUser] = useState(getCurrentUser());
  const [showFilters, setShowFilters] = useState(true);
  const [globalCountries, setGlobalCountries] = useState<string[]>([]);
  const [globalDepartments, setGlobalDepartments] = useState<string[]>([]);
  const [caseStatuses, setCaseStatuses] = useState<any[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    country: '',
    department: '',
    submitter: '',
    reportType: 'overview'
  });
  const [tempFilters, setTempFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    country: '',
    department: '',
    submitter: '',
    reportType: 'overview'
  });

  // Extract user IDs for name resolution - memoized to prevent infinite re-renders
  const userIds = useMemo(() => {
    const uniqueUserIds = new Set<string>();
    cases.forEach(caseItem => {
      if (caseItem.submittedBy) uniqueUserIds.add(caseItem.submittedBy);
      if (caseItem.processedBy) uniqueUserIds.add(caseItem.processedBy);
      if (caseItem.amendedBy) uniqueUserIds.add(caseItem.amendedBy);
    });
    return Array.from(uniqueUserIds);
  }, [cases]);

  // Hook to resolve user IDs to names
  const { getUserName } = useUserNames(userIds);

  // Load countries, departments, and case statuses from database
  useEffect(() => {
    const loadConstants = async () => {
      try {
        // Load countries and case statuses normally, but use standardized departments
        const [countries, statuses] = await Promise.all([
          dynamicConstantsService.getCountries(),
          dynamicConstantsService.getCaseStatuses()
        ]);
        
        // Get departments from all countries using standardized code table
        const { getDepartmentsForCountry } = await import('../utils/supabaseCodeTableService');
        const allDepartments = new Set<string>();
        
        // Collect departments from all countries
        for (const country of countries) {
          try {
            const countryDepartments = await getDepartmentsForCountry(country);
            countryDepartments.forEach(dept => allDepartments.add(dept));
          } catch (error) {
            console.warn(`Failed to load departments for ${country}:`, error);
          }
        }
        
        setGlobalCountries(countries);
        setGlobalDepartments(Array.from(allDepartments).sort());
        setCaseStatuses(statuses);
      } catch (error) {
        console.error('Error loading constants:', error);
        // Fallback to empty arrays, services have their own fallbacks
        setGlobalCountries([]);
        setGlobalDepartments([]);
        setCaseStatuses([]);
      }
    };
    
    loadConstants();
  }, []);

  // Cases are automatically loaded by useRealtimeCases hook (live data)
  // Apply initial filter when cases are loaded
  useEffect(() => {
    setFilteredCases(cases);
  }, [cases]);

  // Initialize tempFilters with current filters
  useEffect(() => {
    setTempFilters({ ...filters });
  }, [filters]);

  // Apply filters whenever filters change - memoized to prevent infinite loops
  const applyFiltersToCase = useCallback((cases: CaseBooking[], filters: ReportFilters) => {
    let filtered = [...cases];

    // Date range filter
    if (filters.dateFrom) {
      filtered = filtered.filter(c => c.dateOfSurgery >= filters.dateFrom);
    }
    if (filters.dateTo) {
      filtered = filtered.filter(c => c.dateOfSurgery <= filters.dateTo);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(c => c.status === filters.status);
    }

    // Country filter
    if (filters.country) {
      filtered = filtered.filter(c => c.country === filters.country);
    }

    // Department filter
    if (filters.department) {
      filtered = filtered.filter(c => c.department === filters.department);
    }

    // Submitter filter
    if (filters.submitter) {
      filtered = filtered.filter(c => {
        const userName = getUserName(c.submittedBy);
        return userName.toLowerCase().includes(filters.submitter.toLowerCase()) ||
               c.submittedBy.toLowerCase().includes(filters.submitter.toLowerCase());
      });
    }

    return filtered;
  }, [getUserName]);

  useEffect(() => {
    const filtered = applyFiltersToCase(cases, filters);
    setFilteredCases(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases, filters]); // Removed applyFiltersToCase from dependencies to prevent infinite loop

  // Generate report data
  const reportData: ReportData = useMemo(() => {
    const totalCases = filteredCases.length;
    
    // Status breakdown - use dynamic case statuses with fallback
    const statusBreakdown: Record<CaseStatus, number> = {} as Record<CaseStatus, number>;
    const allStatuses = caseStatuses.length > 0 
      ? caseStatuses.map(s => s.status || s.display_name) as CaseStatus[]
      : [
          'Case Booked', 'Order Preparation', 'Order Prepared',
          'Pending Delivery (Hospital)', 'Delivered (Hospital)',
          'Case Completed', 'Pending Delivery (Office)', 'Delivered (Office)',
          'To be billed', 'Case Closed', 'Case Cancelled'
        ] as CaseStatus[];
    
    allStatuses.forEach(status => {
      statusBreakdown[status] = filteredCases.filter(c => c.status === status).length;
    });

    // Country breakdown
    const countryBreakdown: Record<string, number> = {};
    globalCountries.forEach(country => {
      countryBreakdown[country] = filteredCases.filter(c => c.country === country).length;
    });

    // Department breakdown
    const departmentBreakdown: Record<string, number> = {};
    globalDepartments.forEach(dept => {
      departmentBreakdown[dept] = filteredCases.filter(c => c.department === dept).length;
    });

    // Monthly trends (last 6 months)
    const monthlyTrends: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      monthlyTrends[monthYear] = filteredCases.filter(c => 
        c.dateOfSurgery.startsWith(monthYear)
      ).length;
    }

    // Top submitters
    const submitterCounts: Record<string, number> = {};
    filteredCases.forEach(c => {
      const userName = getUserName(c.submittedBy);
      submitterCounts[userName] = (submitterCounts[userName] || 0) + 1;
    });
    const topSubmitters = Object.entries(submitterCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate metrics
    const completedCases = filteredCases.filter(c => 
      ['Case Completed', 'Delivered (Office)', 'To be billed', 'Case Closed'].includes(c.status)
    ).length;
    const completionRate = totalCases > 0 ? (completedCases / totalCases) * 100 : 0;

    const urgentCases = filteredCases.filter(c => {
      const surgeryDate = new Date(c.dateOfSurgery);
      const today = new Date();
      const daysUntil = Math.ceil((surgeryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 3 && daysUntil >= 0 && c.status !== 'Case Completed';
    }).length;

    // Calculate average processing time (mock calculation)
    const averageProcessingTime = 2.5; // days

    return {
      totalCases,
      statusBreakdown,
      countryBreakdown,
      departmentBreakdown,
      monthlyTrends,
      topSubmitters,
      averageProcessingTime,
      urgentCases,
      completionRate
    };
  }, [filteredCases, globalCountries, globalDepartments, caseStatuses, getUserName]);

  // Get available options for dropdowns
  const availableSubmitters = useMemo(() => {
    const userIds = Array.from(new Set(cases.map(c => c.submittedBy)));
    return userIds.map(userId => ({
      id: userId,
      name: getUserName(userId)
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [cases, getUserName]);

  const availableCountries = useMemo(() => {
    const userCountries = currentUser?.role === 'admin' || currentUser?.role === 'it' 
      ? globalCountries 
      : (currentUser?.countries || []);
    return Array.from(new Set(cases.map(c => c.country).filter(country => 
      userCountries.includes(country)
    ))).sort();
  }, [cases, currentUser, globalCountries]);

  const availableDepartments = useMemo(() => {
    const userDepartments = currentUser?.role === 'admin' || currentUser?.role === 'it'
      ? globalDepartments
      : (currentUser?.departments || []);
    return Array.from(new Set(cases.map(c => c.department).filter(dept => 
      userDepartments.includes(dept)
    ))).sort();
  }, [cases, currentUser, globalDepartments]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setFilters({ ...tempFilters });
  };

  const clearFilters = () => {
    const defaultFilters: ReportFilters = {
      dateFrom: '',
      dateTo: '',
      status: '',
      country: '',
      department: '',
      submitter: '',
      reportType: 'overview'
    };
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  const exportReport = () => {
    const csvContent = generateCSVReport();
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `case_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVReport = (): string => {
    const headers = [
      'Case Reference', 'Hospital', 'Department', 'Date of Surgery',
      'Procedure Type', 'Procedure Name', 'Doctor', 'Status',
      'Country', 'Submitted By', 'Submitted At'
    ];
    
    const rows = filteredCases.map(c => [
      c.caseReferenceNumber,
      c.hospital,
      c.department,
      c.dateOfSurgery,
      c.procedureType,
      c.procedureName,
      c.doctorName || '',
      c.status,
      c.country,
      c.submittedBy,
      formatDate(new Date(c.submittedAt))
    ]);

    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  };

  const printReport = () => {
    window.print();
  };

  if (!hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.VIEW_REPORTS)) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to view reports.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="reports-title">
          <h1>📊 Reports & Analytics</h1>
          <p>Comprehensive case booking analytics and insights</p>
        </div>
        <div className="reports-actions">
          {hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.EXPORT_DATA) && (
            <button 
              onClick={exportReport}
              className="btn btn-outline-primary"
              title="Export to CSV"
            >
              📤 Export
            </button>
          )}
          <button 
            onClick={printReport}
            className="btn btn-outline-secondary"
            title="Print Report"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="modern-filters-section">
        <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filters-title">
            <h3>🔍 Advanced Filters</h3>
            <span className="active-filters-count">
              {Object.values(tempFilters).filter(value => value && value !== 'overview').length > 0 && 
                `(${Object.values(tempFilters).filter(value => value && value !== 'overview').length} active)`}
            </span>
          </div>
          <button className={`btn btn-outline-secondary btn-sm filters-toggle ${showFilters ? 'expanded' : ''}`}>
            {showFilters ? '▲' : '▼'}
          </button>
        </div>
        
        {showFilters && (
          <div className="filters-content">
            <div className="filters-grid">
              {/* Report Configuration */}
              <div className="filter-category">
                <h4>📊 Report Configuration</h4>
                <div className="filter-row">
                  <div className="modern-filter-group full-width">
                    <label>Report Type</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: 'overview', label: '📊 Overview Dashboard' },
                          { value: 'workflow', label: '⚡ Workflow Analysis' },
                          { value: 'performance', label: '📈 Performance Metrics' },
                          { value: 'detailed', label: '📋 Detailed Report' }
                        ]}
                        value={tempFilters.reportType}
                        onChange={(value) => handleFilterChange('reportType', value)}
                        placeholder="Select Report Type"
                      />
                      <span className="filter-icon">📄</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Filters */}
              <div className="filter-category">
                <h4>🔎 Search</h4>
                <div className="filter-row">
                  <div className="modern-filter-group">
                    <label>Submitter</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Submitters' },
                          ...availableSubmitters.map(submitter => ({
                            value: submitter.name,
                            label: submitter.name
                          }))
                        ]}
                        value={tempFilters.submitter}
                        onChange={(value) => handleFilterChange('submitter', value)}
                        placeholder="All Submitters"
                      />
                      <span className="filter-icon">👤</span>
                    </div>
                  </div>

                  {(currentUser?.role === 'admin' || currentUser?.role === 'it') && (
                    <div className="modern-filter-group">
                      <label>Country</label>
                      <div className="filter-input-wrapper">
                        <SearchableDropdown
                          options={[
                            { value: '', label: 'All Countries' },
                            ...availableCountries.map(country => ({
                              value: country,
                              label: country
                            }))
                          ]}
                          value={tempFilters.country}
                          onChange={(value) => handleFilterChange('country', value)}
                          placeholder="All Countries"
                        />
                        <span className="filter-icon">🌍</span>
                      </div>
                    </div>
                  )}

                  <div className="modern-filter-group">
                    <label>Department</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Departments' },
                          ...availableDepartments.map(dept => ({
                            value: dept,
                            label: dept
                          }))
                        ]}
                        value={tempFilters.department}
                        onChange={(value) => handleFilterChange('department', value)}
                        placeholder="All Departments"
                      />
                      <span className="filter-icon">🏥</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="filter-category">
                <h4>📊 Status</h4>
                <div className="filter-row">
                  <div className="modern-filter-group full-width">
                    <label>Case Status</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Statuses' },
                          ...caseStatuses.map(status => ({
                            value: status.status || status.display_name,
                            label: status.display_name || status.status
                          }))
                        ]}
                        value={tempFilters.status}
                        onChange={(value) => handleFilterChange('status', value)}
                        placeholder="All Statuses"
                      />
                      <span className="filter-icon">🔄</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Date Filters */}
              <div className="filter-category">
                <h4>📅 Date Range</h4>
                <div className="filter-row">
                  <div className="modern-filter-group">
                    <label>Start Date</label>
                    <div className="filter-input-wrapper">
                      <FilterDatePicker
                        value={tempFilters.dateFrom}
                        onChange={(date) => handleFilterChange('dateFrom', date)}
                        placeholder="Select start date"
                      />
                      <span className="filter-icon">📅</span>
                    </div>
                  </div>

                  <div className="modern-filter-group">
                    <label>End Date</label>
                    <div className="filter-input-wrapper">
                      <FilterDatePicker
                        value={tempFilters.dateTo}
                        onChange={(date) => handleFilterChange('dateTo', date)}
                        placeholder="Select end date"
                        min={tempFilters.dateFrom || undefined}
                      />
                      <span className="filter-icon">📅</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Actions */}
            <div className="modern-filter-actions">
              <div className="filter-stats">
                Showing {filteredCases.length} of {cases.length} cases
              </div>
              <div className="filter-buttons">
                <button 
                  onClick={clearFilters}
                  className="btn btn-outline-secondary btn-md modern-clear-button"
                  disabled={Object.values(tempFilters).filter(value => value && value !== 'overview').length === 0}
                >
                  🗑️ Clear All
                </button>
                <button 
                  onClick={applyFilters}
                  className="btn btn-primary btn-md modern-apply-button"
                >
                  ✨ Apply Filters
                </button>
              </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="quick-filters">
              <span className="quick-filters-label">Quick Filters:</span>
              <button 
                onClick={() => handleFilterChange('reportType', 'overview')}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                📊 Overview
              </button>
              <button 
                onClick={() => handleFilterChange('reportType', 'workflow')}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                ⚡ Workflow
              </button>
              <button 
                onClick={() => handleFilterChange('reportType', 'performance')}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                📈 Performance
              </button>
              <button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  handleFilterChange('dateFrom', today);
                  handleFilterChange('dateTo', today);
                }}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                📅 Today
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Report Content */}
      <div className="reports-content">
        {filters.reportType === 'overview' && (
          <OverviewDashboard data={reportData} />
        )}
        {filters.reportType === 'workflow' && (
          <WorkflowAnalysis data={reportData} />
        )}
        {filters.reportType === 'performance' && (
          <PerformanceMetrics data={reportData} />
        )}
        {filters.reportType === 'detailed' && (
          <DetailedReport cases={filteredCases} getUserName={getUserName} />
        )}
      </div>
    </div>
  );
};

// Overview Dashboard Component
const OverviewDashboard: React.FC<{ data: ReportData }> = ({ data }) => (
  <div className="overview-dashboard">
    <div className="metrics-grid">
      <div className="metric-card primary">
        <div className="metric-icon">📊</div>
        <div className="metric-content">
          <div className="metric-value">{data.totalCases}</div>
          <div className="metric-label">Total Cases</div>
        </div>
      </div>
      
      <div className="metric-card success">
        <div className="metric-icon">✅</div>
        <div className="metric-content">
          <div className="metric-value">{data.completionRate.toFixed(1)}%</div>
          <div className="metric-label">Completion Rate</div>
        </div>
      </div>
      
      <div className="metric-card warning">
        <div className="metric-icon">⚡</div>
        <div className="metric-content">
          <div className="metric-value">{data.urgentCases}</div>
          <div className="metric-label">Urgent Cases</div>
        </div>
      </div>
      
      <div className="metric-card info">
        <div className="metric-icon">⏱️</div>
        <div className="metric-content">
          <div className="metric-value">{data.averageProcessingTime}</div>
          <div className="metric-label">Avg. Processing (days)</div>
        </div>
      </div>
    </div>

    <div className="charts-grid">
      <div className="chart-container">
        <h4>📈 Status Distribution</h4>
        <div className="status-breakdown">
          {Object.entries(data.statusBreakdown).map(([status, count]) => (
            count > 0 && (
              <div key={status} className="status-item">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(status as CaseStatus) }}
                ></div>
                <span className="status-name">{status}</span>
                <span className="status-count">{count}</span>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="chart-container">
        <h4>🌍 Country Distribution</h4>
        <div className="country-breakdown">
          {Object.entries(data.countryBreakdown).map(([country, count]) => (
            count > 0 && (
              <div key={country} className="country-item">
                <span className="country-name">{country}</span>
                <div className="country-bar">
                  <div 
                    className="country-bar-fill"
                    style={{ 
                      width: `${(count / data.totalCases) * 100}%`,
                      backgroundColor: '#20b2aa'
                    }}
                  ></div>
                </div>
                <span className="country-count">{count}</span>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Workflow Analysis Component
const WorkflowAnalysis: React.FC<{ data: ReportData }> = ({ data }) => (
  <div className="workflow-analysis">
    <h3>⚡ Workflow Performance Analysis</h3>
    <div className="workflow-metrics">
      <div className="workflow-stage">
        <h4>📝 Case Booking</h4>
        <div className="stage-count">{data.statusBreakdown['Case Booked']}</div>
        <div className="stage-description">New cases awaiting processing</div>
      </div>
      
      <div className="workflow-stage">
        <h4>📋 Order Processing</h4>
        <div className="stage-count">
          {data.statusBreakdown['Order Preparation'] + data.statusBreakdown['Order Prepared']}
        </div>
        <div className="stage-description">Cases being prepared</div>
      </div>
      
      <div className="workflow-stage">
        <h4>🚚 Delivery</h4>
        <div className="stage-count">
          {data.statusBreakdown['Pending Delivery (Hospital)'] + data.statusBreakdown['Delivered (Hospital)']}
        </div>
        <div className="stage-description">Hospital delivery process</div>
      </div>
      
      <div className="workflow-stage">
        <h4>✅ Completion</h4>
        <div className="stage-count">
          {data.statusBreakdown['Case Completed'] + data.statusBreakdown['Delivered (Office)'] + data.statusBreakdown['To be billed']}
        </div>
        <div className="stage-description">Completed cases</div>
      </div>
    </div>
  </div>
);

// Performance Metrics Component
const PerformanceMetrics: React.FC<{ data: ReportData }> = ({ data }) => (
  <div className="performance-metrics">
    <h3>📈 Performance Analytics</h3>
    
    <div className="performance-section">
      <h4>🏆 Top Performers</h4>
      <div className="top-submitters">
        {data.topSubmitters.slice(0, 5).map((submitter, index) => (
          <div key={submitter.name} className="submitter-item">
            <div className="submitter-rank">#{index + 1}</div>
            <div className="submitter-name">{submitter.name}</div>
            <div className="submitter-count">{submitter.count} cases</div>
          </div>
        ))}
      </div>
    </div>

    <div className="performance-section">
      <h4>📅 Monthly Trends</h4>
      <div className="monthly-trends">
        {Object.entries(data.monthlyTrends).map(([month, count]) => (
          <div key={month} className="month-item">
            <div className="month-name">{month}</div>
            <div className="month-bar">
              <div 
                className="month-bar-fill"
                style={{ 
                  height: `${Math.max((count / Math.max(...Object.values(data.monthlyTrends))) * 100, 5)}%`,
                  backgroundColor: '#20b2aa'
                }}
              ></div>
            </div>
            <div className="month-count">{count}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Detailed Report Component
const DetailedReport: React.FC<{ cases: CaseBooking[]; getUserName: (userId: string) => string }> = ({ cases, getUserName }) => (
  <div className="detailed-report">
    <h3>📋 Detailed Case Report</h3>
    <div className="detailed-table-container">
      <table className="detailed-table">
        <thead>
          <tr>
            <th>Case Reference</th>
            <th>Hospital</th>
            <th>Department</th>
            <th>Surgery Date</th>
            <th>Procedure</th>
            <th>Status</th>
            <th>Country</th>
            <th>Submitted By</th>
          </tr>
        </thead>
        <tbody>
          {cases.map(caseItem => (
            <tr key={caseItem.id}>
              <td className="case-ref">{caseItem.caseReferenceNumber}</td>
              <td>{caseItem.hospital}</td>
              <td>{caseItem.department}</td>
              <td>{formatDate(new Date(caseItem.dateOfSurgery))}</td>
              <td>
                <div className="procedure-info">
                  <div className="procedure-type">{caseItem.procedureType}</div>
                  <div className="procedure-name">{caseItem.procedureName}</div>
                </div>
              </td>
              <td>
                <span 
                  className="status-badge"
                  style={{ 
                    backgroundColor: getStatusColor(caseItem.status),
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem'
                  }}
                >
                  {caseItem.status}
                </span>
              </td>
              <td>{caseItem.country}</td>
              <td>{getUserName(caseItem.submittedBy)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Reports;