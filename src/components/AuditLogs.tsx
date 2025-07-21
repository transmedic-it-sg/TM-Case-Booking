import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getAuditLogs, getFilteredAuditLogs, clearOldAuditLogs, exportAuditLogs, AuditLogEntry } from '../utils/auditService';
import SearchableDropdown from './SearchableDropdown';
import FilterDatePicker from './FilterDatePicker';

const AuditLogs: React.FC = () => {
  const currentUser = getCurrentUser();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    action: '',
    user: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });
  const [tempFilters, setTempFilters] = useState({
    category: '',
    action: '',
    user: '',
    status: '',
    dateFrom: '',
    dateTo: ''
  });

  // Check permission
  const canViewAuditLogs = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.AUDIT_LOGS) : false;

  const loadAuditLogs = useCallback(async () => {
    try {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setAuditLogs([]);
    }
  }, []);

  const applyFilters = useCallback(async () => {
    try {
      const filtered = await getFilteredAuditLogs({
        category: filters.category || undefined,
        action: filters.action || undefined,
        status: filters.status || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        // Filter by user name if provided
        ...(filters.user && { userId: filters.user })
      });

      // Additional client-side filtering for user name search
      let finalFiltered = filtered;
      if (filters.user) {
        finalFiltered = filtered.filter(log => 
          log.user.toLowerCase().includes(filters.user.toLowerCase())
        );
      }

      setFilteredLogs(finalFiltered);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setFilteredLogs(auditLogs);
    }
  }, [auditLogs, filters]);

  useEffect(() => {
    if (canViewAuditLogs) {
      loadAuditLogs();
    }
  }, [canViewAuditLogs, loadAuditLogs]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleExportLogs = async () => {
    try {
      const exportData = await exportAuditLogs(filters);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  const handleClearOldLogs = async () => {
    if (window.confirm('Are you sure you want to clear audit logs older than 90 days? This action cannot be undone.')) {
      try {
        const deletedCount = await clearOldAuditLogs(90);
        alert(`Successfully cleared ${deletedCount} old audit log entries.`);
        await loadAuditLogs();
      } catch (error) {
        console.error('Failed to clear old logs:', error);
        alert('Failed to clear old logs. Please try again.');
      }
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setTempFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFiltersHandler = () => {
    setFilters({ ...tempFilters });
  };

  const clearFilters = () => {
    const defaultFilters = {
      category: '',
      action: '',
      user: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    };
    setTempFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  // Initialize tempFilters with current filters
  useEffect(() => {
    setTempFilters({ ...filters });
  }, [filters]);

  // Pagination
  const getCurrentPageLogs = () => {
    const indexOfLastLog = currentPage * logsPerPage;
    const indexOfFirstLog = indexOfLastLog - logsPerPage;
    return filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  };

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'success': return 'status-badge success';
      case 'warning': return 'status-badge warning';
      case 'error': return 'status-badge error';
      default: return 'status-badge';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    // Import formatDateTime from utils if not already imported
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) {
      return 'Invalid Date';
    }
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[d.getDay()];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${dayName}, ${day}/${month}/${year} ${hours}:${minutes}`;
  };

  if (!canViewAuditLogs) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to view audit logs.</p>
          <p>Contact your system administrator for access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-logs">
      <div className="audit-logs-header">
        <div className="header-content">
          <h2>📊 System Audit Logs</h2>
          <p>Complete audit trail of all system activities and user actions</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{filteredLogs.length}</span>
            <span className="stat-label">Total Entries</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{new Set(filteredLogs.map(log => log.user)).size}</span>
            <span className="stat-label">Active Users</span>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="modern-filters-section">
        <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filters-title">
            <h3>🔍 Advanced Filters</h3>
            <span className="active-filters-count">
              {Object.values(tempFilters).some(value => value) && `(${Object.values(tempFilters).filter(value => value).length} active)`}
            </span>
          </div>
          <button className={`btn btn-outline-secondary btn-sm filters-toggle ${showFilters ? 'expanded' : ''}`}>
            {showFilters ? '▲' : '▼'}
          </button>
        </div>
        
        {showFilters && (
          <div className="filters-content">
            <div className="filters-grid">
              {/* Search Filters */}
              <div className="filter-category">
                <h4>🔎 Search</h4>
                <div className="filter-row">
                  <div className="modern-filter-group">
                    <label>User</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Users' },
                          ...Array.from(new Set(auditLogs.map(log => log.user))).map(user => ({
                            value: user,
                            label: user
                          }))
                        ]}
                        value={tempFilters.user}
                        onChange={(value) => handleFilterChange('user', value)}
                        placeholder="All Users"
                      />
                      <span className="filter-icon">👤</span>
                    </div>
                  </div>

                  <div className="modern-filter-group">
                    <label>Action</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Actions' },
                          ...Array.from(new Set(auditLogs.map(log => log.action))).map(action => ({
                            value: action,
                            label: action
                          }))
                        ]}
                        value={tempFilters.action}
                        onChange={(value) => handleFilterChange('action', value)}
                        placeholder="All Actions"
                      />
                      <span className="filter-icon">⚡</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="filter-category">
                <h4>📊 Status & Category</h4>
                <div className="filter-row">
                  <div className="modern-filter-group">
                    <label>Category</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Categories' },
                          { value: 'User Management', label: 'User Management' },
                          { value: 'Case Management', label: 'Case Management' },
                          { value: 'Status Change', label: 'Status Change' },
                          { value: 'Security', label: 'Security' },
                          { value: 'System', label: 'System' }
                        ]}
                        value={tempFilters.category}
                        onChange={(value) => handleFilterChange('category', value)}
                        placeholder="All Categories"
                      />
                      <span className="filter-icon">📁</span>
                    </div>
                  </div>

                  <div className="modern-filter-group">
                    <label>Status</label>
                    <div className="filter-input-wrapper">
                      <SearchableDropdown
                        options={[
                          { value: '', label: 'All Statuses' },
                          { value: 'success', label: 'Success' },
                          { value: 'warning', label: 'Warning' },
                          { value: 'error', label: 'Error' }
                        ]}
                        value={tempFilters.status}
                        onChange={(value) => handleFilterChange('status', value)}
                        placeholder="All Statuses"
                      />
                      <span className="filter-icon">🎯</span>
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
                        onChange={(value) => handleFilterChange('dateFrom', value)}
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
                        onChange={(value) => handleFilterChange('dateTo', value)}
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
                Showing {filteredLogs.length} of {auditLogs.length} log entries
              </div>
              <div className="filter-buttons">
                <button 
                  onClick={clearFilters} 
                  className="btn btn-outline-secondary btn-md modern-clear-button"
                  disabled={!Object.values(tempFilters).some(value => value)}
                >
                  🗑️ Clear All
                </button>
                <button 
                  onClick={applyFiltersHandler} 
                  className="btn btn-primary btn-md modern-apply-button"
                >
                  ✨ Apply Filters
                </button>
                <button 
                  onClick={loadAuditLogs} 
                  className="btn btn-outline-secondary btn-md"
                >
                  🔄 Refresh
                </button>
                {hasPermission(currentUser?.role || '', PERMISSION_ACTIONS.EXPORT_DATA) && (
                  <button 
                    onClick={handleExportLogs} 
                    className="btn btn-success btn-md"
                  >
                    📥 Export
                  </button>
                )}
                {currentUser?.role === 'admin' && (
                  <button 
                    onClick={handleClearOldLogs} 
                    className="btn btn-warning btn-md"
                  >
                    🗑️ Clear Old
                  </button>
                )}
              </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="quick-filters">
              <span className="quick-filters-label">Quick Filters:</span>
              <button 
                onClick={() => setFilters(prev => ({ ...prev, category: 'Case Management' }))}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                📋 Cases
              </button>
              <button 
                onClick={() => setFilters(prev => ({ ...prev, category: 'User Management' }))}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                👥 Users
              </button>
              <button 
                onClick={() => setFilters(prev => ({ ...prev, status: 'error' }))}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                ❌ Errors
              </button>
              <button 
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setFilters(prev => ({ ...prev, dateFrom: today, dateTo: today }));
                }}
                className="btn btn-outline-secondary btn-sm quick-filter-button"
              >
                📅 Today
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="audit-logs-table">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Role</th>
              <th>Action</th>
              <th>Category</th>
              <th>Target</th>
              <th>Status</th>
              <th>Country</th>
              <th>Department</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentPageLogs().map(log => (
              <tr key={log.id} className={`log-row ${log.status}`}>
                <td className="timestamp-cell">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="user-cell">
                  <strong>{log.user}</strong>
                </td>
                <td className="role-cell">
                  <span className="role-badge">{log.userRole || 'N/A'}</span>
                </td>
                <td className="action-cell">
                  {log.action}
                </td>
                <td className="category-cell">
                  <span className="category-badge">{log.category}</span>
                </td>
                <td className="target-cell">
                  {log.target}
                </td>
                <td className="status-cell">
                  <span className={getStatusBadgeClass(log.status)}>
                    {log.status.toUpperCase()}
                  </span>
                </td>
                <td className="country-cell">
                  {log.country || 'N/A'}
                </td>
                <td className="department-cell">
                  {log.department || 'N/A'}
                </td>
                <td className="details-cell">
                  <div className="details-preview" title={log.details}>
                    {log.details.length > 40 ? `${log.details.substring(0, 40)}...` : log.details}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredLogs.length === 0 && (
          <div className="no-logs">
            <p>📝 No audit logs found matching your criteria.</p>
            <button onClick={clearFilters} className="btn btn-outline-primary">
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
            </div>
            <div className="pagination-controls">
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                First
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                if (pageNumber === 1 || pageNumber === totalPages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                  return (
                    <button
                      key={pageNumber}
                      className={`btn btn-sm ${pageNumber === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                  return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                }
                return null;
              })}
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;