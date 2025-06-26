import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUser } from '../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { useNotifications } from '../contexts/NotificationContext';
import SearchableDropdown from './SearchableDropdown';
import FilterDatePicker from './FilterDatePicker';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: string;
  target: string;
  details: string;
  ipAddress: string;
  status: 'success' | 'warning' | 'error';
}

const AuditLogs: React.FC = () => {
  const currentUser = getCurrentUser();
  const { notifications } = useNotifications();
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

  // Check permission
  const canViewAuditLogs = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.AUDIT_LOGS) : false;

  const loadAuditLogs = useCallback(() => {
    // Convert notifications to audit logs and add system logs
    const systemLogs: AuditLogEntry[] = [
      {
        id: 'sys001',
        timestamp: new Date().toISOString(),
        user: 'System',
        action: 'Application Started',
        category: 'System',
        target: 'Application',
        details: 'Case booking application initialized',
        ipAddress: '127.0.0.1',
        status: 'success'
      },
      {
        id: 'sys002',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        user: 'System',
        action: 'Permission Check',
        category: 'Security',
        target: 'Permission Matrix',
        details: 'Audit logs permission verified',
        ipAddress: '127.0.0.1',
        status: 'success'
      }
    ];

    // Convert notifications to audit logs
    const notificationLogs: AuditLogEntry[] = notifications.map((notification, index) => ({
      id: `notif-${index}`,
      timestamp: notification.timestamp,
      user: notification.title.includes('User') ? 'Admin' : 'System',
      action: notification.title,
      category: getActionCategory(notification.title),
      target: extractTarget(notification.message),
      details: notification.message,
      ipAddress: '192.168.1.100',
      status: notification.type === 'error' ? 'error' : notification.type === 'warning' ? 'warning' : 'success'
    }));

    const allLogs = [...systemLogs, ...notificationLogs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setAuditLogs(allLogs);
  }, [notifications]);

  const applyFilters = useCallback(() => {
    let filtered = auditLogs;

    if (filters.category) {
      filtered = filtered.filter(log => log.category === filters.category);
    }

    if (filters.action) {
      filtered = filtered.filter(log => 
        log.action.toLowerCase().includes(filters.action.toLowerCase())
      );
    }

    if (filters.user) {
      filtered = filtered.filter(log => 
        log.user.toLowerCase().includes(filters.user.toLowerCase())
      );
    }

    if (filters.status) {
      filtered = filtered.filter(log => log.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(log => 
        new Date(log.timestamp) <= new Date(filters.dateTo + 'T23:59:59')
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [auditLogs, filters]);

  useEffect(() => {
    if (canViewAuditLogs) {
      loadAuditLogs();
    }
  }, [canViewAuditLogs, loadAuditLogs]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const getActionCategory = (title: string): string => {
    if (title.includes('User')) return 'User Management';
    if (title.includes('Case')) return 'Case Management';
    if (title.includes('Status')) return 'Status Change';
    if (title.includes('Permission')) return 'Security';
    return 'System';
  };

  const extractTarget = (message: string): string => {
    const caseMatch = message.match(/TMC\d+/);
    if (caseMatch) return caseMatch[0];
    
    const userMatch = message.match(/(\w+\s+\w+)\s*\(/);
    if (userMatch) return userMatch[1];
    
    return 'System';
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      action: '',
      user: '',
      status: '',
      dateFrom: '',
      dateTo: ''
    });
  };

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
    return new Date(timestamp).toLocaleString();
  };

  if (!canViewAuditLogs) {
    return (
      <div className="audit-logs">
        <div className="access-denied">
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
              {Object.values(filters).some(value => value) && `(${Object.values(filters).filter(value => value).length} active)`}
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
                        value={filters.user}
                        onChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
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
                        value={filters.action}
                        onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
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
                        value={filters.category}
                        onChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
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
                        value={filters.status}
                        onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
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
                    <label>Date</label>
                    <div className="filter-input-wrapper">
                      <FilterDatePicker
                        value={filters.dateFrom}
                        onChange={(value) => setFilters(prev => ({ ...prev, dateFrom: value }))}
                        placeholder="Select start date"
                      />
                    </div>
                  </div>

                  <div className="modern-filter-group">
                    <label>Date</label>
                    <div className="filter-input-wrapper">
                      <FilterDatePicker
                        value={filters.dateTo}
                        onChange={(value) => setFilters(prev => ({ ...prev, dateTo: value }))}
                        placeholder="Select end date"
                        min={filters.dateFrom || undefined}
                      />
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
                  disabled={!Object.values(filters).some(value => value)}
                >
                  🗑️ Clear All
                </button>
                <button 
                  onClick={loadAuditLogs} 
                  className="btn btn-primary btn-md modern-apply-button"
                >
                  🔄 Refresh
                </button>
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
              <th>Action</th>
              <th>Category</th>
              <th>Target</th>
              <th>Status</th>
              <th>IP Address</th>
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
                <td className="ip-cell">
                  {log.ipAddress}
                </td>
                <td className="details-cell">
                  <div className="details-preview" title={log.details}>
                    {log.details.length > 50 ? `${log.details.substring(0, 50)}...` : log.details}
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