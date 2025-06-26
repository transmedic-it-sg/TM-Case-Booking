import React, { useState, useEffect, useMemo } from 'react';
import { CaseBooking, CaseStatus, COUNTRIES, DEPARTMENTS } from '../types';
import { getCases } from '../utils/storage';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getStatusColor } from './CasesList/utils';
import { formatDate } from '../utils/dateFormat';
import FilterDatePicker from './FilterDatePicker';
import './Reports.css';

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
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseBooking[]>([]);
  const [currentUser] = useState(getCurrentUser());
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: '',
    dateTo: '',
    status: '',
    country: '',
    department: '',
    submitter: '',
    reportType: 'overview'
  });

  // Load cases on component mount
  useEffect(() => {
    const allCases = getCases();
    const userCases = allCases.filter(caseItem => {
      // Filter by user's access permissions
      if (currentUser?.role === 'admin' || currentUser?.role === 'it') {
        return true;
      }
      
      // Filter by user's countries and departments
      const hasCountryAccess = !currentUser?.countries?.length || 
        currentUser.countries.includes(caseItem.country);
      const hasDepartmentAccess = !currentUser?.departments?.length || 
        currentUser.departments.includes(caseItem.department);
      
      return hasCountryAccess && hasDepartmentAccess;
    });
    
    setCases(userCases);
    setFilteredCases(userCases);
  }, [currentUser]);

  // Apply filters whenever filters change
  useEffect(() => {
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
      filtered = filtered.filter(c => 
        c.submittedBy.toLowerCase().includes(filters.submitter.toLowerCase())
      );
    }

    setFilteredCases(filtered);
  }, [cases, filters]);

  // Generate report data
  const reportData: ReportData = useMemo(() => {
    const totalCases = filteredCases.length;
    
    // Status breakdown
    const statusBreakdown: Record<CaseStatus, number> = {} as Record<CaseStatus, number>;
    const allStatuses: CaseStatus[] = [
      'Case Booked', 'Order Preparation', 'Order Prepared',
      'Pending Delivery (Hospital)', 'Delivered (Hospital)',
      'Case Completed', 'Pending Delivery (Office)', 'Delivered (Office)',
      'To be billed', 'Case Closed', 'Case Cancelled'
    ];
    
    allStatuses.forEach(status => {
      statusBreakdown[status] = filteredCases.filter(c => c.status === status).length;
    });

    // Country breakdown
    const countryBreakdown: Record<string, number> = {};
    COUNTRIES.forEach(country => {
      countryBreakdown[country] = filteredCases.filter(c => c.country === country).length;
    });

    // Department breakdown
    const departmentBreakdown: Record<string, number> = {};
    DEPARTMENTS.forEach(dept => {
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
      submitterCounts[c.submittedBy] = (submitterCounts[c.submittedBy] || 0) + 1;
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
  }, [filteredCases]);

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      status: '',
      country: '',
      department: '',
      submitter: '',
      reportType: 'overview'
    });
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
          <button 
            onClick={exportReport}
            className="btn btn-outline-primary"
            title="Export to CSV"
          >
            📤 Export
          </button>
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
      <div className="reports-filters">
        <h3>🔍 Advanced Filters</h3>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Report Type</label>
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange('reportType', e.target.value)}
              className="form-control"
            >
              <option value="overview">📊 Overview Dashboard</option>
              <option value="workflow">⚡ Workflow Analysis</option>
              <option value="performance">📈 Performance Metrics</option>
              <option value="detailed">📋 Detailed Report</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Date Range</label>
            <div className="date-range-inputs">
              <FilterDatePicker
                value={filters.dateFrom}
                onChange={(date) => handleFilterChange('dateFrom', date)}
                placeholder="Start Date"
                className="form-control"
              />
              <FilterDatePicker
                value={filters.dateTo}
                onChange={(date) => handleFilterChange('dateTo', date)}
                placeholder="End Date"
                className="form-control"
              />
            </div>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="form-control"
            >
              <option value="">All Statuses</option>
              <option value="Case Booked">Case Booked</option>
              <option value="Order Preparation">Order Preparation</option>
              <option value="Order Prepared">Order Prepared</option>
              <option value="Pending Delivery (Hospital)">Pending Delivery (Hospital)</option>
              <option value="Delivered (Hospital)">Delivered (Hospital)</option>
              <option value="Case Completed">Case Completed</option>
              <option value="Pending Delivery (Office)">Pending Delivery (Office)</option>
              <option value="Delivered (Office)">Delivered (Office)</option>
              <option value="To be billed">To be billed</option>
              <option value="Case Closed">Case Closed</option>
              <option value="Case Cancelled">Case Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Country</label>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="form-control"
            >
              <option value="">All Countries</option>
              {COUNTRIES.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Department</label>
            <select
              value={filters.department}
              onChange={(e) => handleFilterChange('department', e.target.value)}
              className="form-control"
            >
              <option value="">All Departments</option>
              {DEPARTMENTS.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Submitter</label>
            <input
              type="text"
              value={filters.submitter}
              onChange={(e) => handleFilterChange('submitter', e.target.value)}
              placeholder="Search by submitter name"
              className="form-control"
            />
          </div>
        </div>

        <div className="filter-actions">
          <button 
            onClick={clearFilters}
            className="btn btn-outline-secondary"
          >
            🗑️ Clear Filters
          </button>
          <span className="results-count">
            Showing {filteredCases.length} of {cases.length} cases
          </span>
        </div>
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
          <DetailedReport cases={filteredCases} />
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
const DetailedReport: React.FC<{ cases: CaseBooking[] }> = ({ cases }) => (
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
              <td>{caseItem.submittedBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default Reports;