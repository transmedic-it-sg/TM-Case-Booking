import React, { useState, useEffect, useCallback } from 'react';
import { getCurrentUserSync } from '../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getAuditLogs, getFilteredAuditLogs, clearOldAuditLogs, exportAuditLogs, AuditLogEntry } from '../utils/auditService';
import { getSupabaseUsers } from '../utils/supabaseUserService';
import { User } from '../types';
import SearchableDropdown from './SearchableDropdown';
import FilterDatePicker from './FilterDatePicker';
import '../assets/components/AuditLogs.css';

const AuditLogs: React.FC = () => {
  const currentUser = getCurrentUserSync();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<string>('');
  const [showActiveUsersModal, setShowActiveUsersModal] = useState(false);
  const [showClearLogsModal, setShowClearLogsModal] = useState(false);
  const [clearLogsConfirmText, setClearLogsConfirmText] = useState('');
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{username: string, userId: string, lastActivity?: string, isActive: boolean, status: string}[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
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
  
  // Debug logging for audit logs access
  console.log('🔍 AUDIT LOGS ACCESS DEBUG:', {
    currentUser: currentUser?.username,
    role: currentUser?.role,
    auditLogsAction: PERMISSION_ACTIONS.AUDIT_LOGS,
    canViewAuditLogs,
    timestamp: new Date().toISOString()
  });

  // Load users for mapping user IDs to usernames
  const loadUsers = useCallback(async () => {
    try {
      const users = await getSupabaseUsers();
      const map = new Map<string, User>();
      users.forEach(user => {
        map.set(user.id, user);
      });
      setUserMap(map);
    } catch (error) {
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const logs = await getAuditLogs();
      setAuditLogs(logs);
    } catch (error) {
      setAuditLogs([]);
    }
  }, []);

  // Helper function to get actual user name from userMap, fallback to log.user
  const getUserDisplayName = useCallback((log: AuditLogEntry): string => {
    const user = userMap.get(log.userId);
    if (user && user.name) {
      return user.name;
    }
    // Fallback to stored user name, but check if it looks like a UUID
    if (log.user && !log.user.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return log.user;
    }
    // If stored user name looks like UUID, try to find name from userId
    return user?.username || log.user || 'Unknown User';
  }, [userMap]);

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
          getUserDisplayName(log).toLowerCase().includes(filters.user.toLowerCase())
        );
      }

      setFilteredLogs(finalFiltered);
      setCurrentPage(1);
    } catch (error) {
      setFilteredLogs(auditLogs);
    }
  }, [auditLogs, filters, getUserDisplayName]);

  useEffect(() => {
    if (canViewAuditLogs) {
      loadAuditLogs();
      loadUsers();
    }
  }, [canViewAuditLogs, loadAuditLogs, loadUsers]);

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
    }
  };

  const handleClearOldLogs = () => {
    setShowClearLogsModal(true);
    setClearLogsConfirmText('');
  };

  const confirmClearOldLogs = async () => {
    if (clearLogsConfirmText !== 'Confirm to delete Audit Log') {
      return; // Don't proceed if confirmation text doesn't match
    }

    setIsClearingLogs(true);
    try {
      const deletedCount = await clearOldAuditLogs(); // No parameter = 6 months (180 days)
      alert(`Successfully cleared ${deletedCount} old audit log entries (older than 6 months).`);
      await loadAuditLogs();
      setShowClearLogsModal(false);
      setClearLogsConfirmText('');
    } catch (error) {
      alert('Failed to clear old logs. Please try again.');
    } finally {
      setIsClearingLogs(false);
    }
  };

  const cancelClearOldLogs = () => {
    setShowClearLogsModal(false);
    setClearLogsConfirmText('');
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

  // Modal functions
  const openDetailsModal = (details: string) => {
    setSelectedLogDetails(details);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedLogDetails('');
  };

  // Helper function to get actual active users count (excluding inactive users)
  const getActiveUsersCount = (): number => {
    const userIds = Array.from(new Set(filteredLogs.map(log => log.userId)));
    let activeCount = 0;

    userIds.forEach(userId => {
      // Find the most recent login and logout for this user
      const userAuthLogs = auditLogs.filter(log =>
        log.userId === userId &&
        log.category === 'Authentication' &&
        (log.action === 'User Login' || log.action === 'User Logout')
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Check if user is currently active (last action was login, not logout)
      const isActive = userAuthLogs.length > 0 && userAuthLogs[0].action === 'User Login';
      if (isActive) {
        activeCount++;
      }
    });

    return activeCount;
  };

  const openActiveUsersModal = () => {
    // Get unique user IDs from all audit logs, filtering out null/undefined values
    const userIds = Array.from(new Set(
      auditLogs
        .map(log => log.userId)
        .filter(userId => userId && userId.trim() !== '') // Remove null, undefined, and empty strings
    ));

    // Create a Map to store unique users by both userId and username to avoid duplicates
    const userStatusMap = new Map<string, {
      username: string;
      userId: string;
      lastActivity?: string;
      isActive: boolean;
      status: string;
    }>();

    // Also create a set to track processed usernames to avoid username duplicates
    const processedUsernames = new Set<string>();

    userIds.forEach(userId => {
      const user = userMap.get(userId);

      // Find the most recent login and logout for this user
      const userAuthLogs = auditLogs.filter(log =>
        log.userId === userId &&
        log.category === 'Authentication' &&
        (log.action === 'User Login' || log.action === 'User Logout')
      ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Get username with fallback logic
      const username = user ? user.name : (auditLogs.find(log => log.userId === userId)?.user || 'Unknown User');

      // Skip if we've already processed this username to avoid duplicates
      if (processedUsernames.has(username)) {
        return;
      }

      // Check if user is currently active (last action was login, not logout)
      const isActive = userAuthLogs.length > 0 && userAuthLogs[0].action === 'User Login';
      const lastActivity = userAuthLogs.length > 0 ? userAuthLogs[0].timestamp : undefined;

      // Only add users who have some authentication activity
      if (userAuthLogs.length > 0) {
        const uniqueKey = `${userId}_${username}`;
        userStatusMap.set(uniqueKey, {
          username,
          userId,
          lastActivity,
          isActive,
          status: isActive ? 'Active' : 'Inactive'
        });
        processedUsernames.add(username);
      }
    });

    // Convert Map to array and sort by active status first, then by last activity
    const sortedUsers = Array.from(userStatusMap.values()).sort((a, b) => {
      // First, sort by active status (active users first)
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;

      // Then sort by last activity (most recent first)
      if (a.lastActivity && b.lastActivity) {
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      }

      // Finally, sort by username alphabetically
      return a.username.localeCompare(b.username);
    });

    setActiveUsers(sortedUsers);
    setShowActiveUsersModal(true);
  };

  const closeActiveUsersModal = () => {
    setShowActiveUsersModal(false);
    setActiveUsers([]);
  };

  // Close modal when clicking outside or pressing ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDetailsModal();
        closeActiveUsersModal();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (target.classList.contains('modal-overlay')) {
        closeDetailsModal();
        closeActiveUsersModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

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
          <div className="stat-item clickable-stat" onClick={openActiveUsersModal}>
            <span className="stat-value">{getActiveUsersCount()}</span>
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
                          ...Array.from(new Set(auditLogs.map(log => getUserDisplayName(log)))).map(user => ({
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
                  className="btn btn-outline-secondary btn-md refresh-button"
                >
                  ↻ Refresh
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
                  <strong>{getUserDisplayName(log)}</strong>
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
                    {log.details.length > 40 && (
                      <button
                        className="btn btn-link btn-sm more-details-btn"
                        onClick={() => openDetailsModal(log.details)}
                        title="Click to view full details"
                      >
                        More details
                      </button>
                    )}
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

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeDetailsModal()}>
          <div className="modal-content details-modal">
            <div className="modal-header">
              <h3>📋 Audit Log Details</h3>
              <button className="modal-close-btn" onClick={closeDetailsModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="details-content">
                <p>{selectedLogDetails}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeDetailsModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Users Modal */}
      {showActiveUsersModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeActiveUsersModal()}>
          <div className="modal-content active-users-modal">
            <div className="modal-header">
              <h3>👥 Active Users ({activeUsers.length})</h3>
              <button className="modal-close-btn" onClick={closeActiveUsersModal}>×</button>
            </div>
            <div className="modal-body">
              {activeUsers.length > 0 ? (
                <div className="users-table">
                  <div className="table-header">
                    <div className="table-column-header">User Name</div>
                    <div className="table-column-header">Last Activity</div>
                  </div>
                  <div className="table-body">
                    {activeUsers.map((user, index) => (
                      <div key={index} className={`table-row ${user.isActive ? 'active-user' : 'inactive-user'}`}>
                        <div className="table-cell user-name-cell">
                          <span className={`status-indicator ${user.isActive ? 'online' : 'offline'}`}></span>
                          <span className="user-name">{user.username}</span>
                          <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                            {user.status}
                          </span>
                        </div>
                        <div className="table-cell last-activity-cell">
                          {user.lastActivity ? (
                            <span className="last-activity-time">
                              {new Date(user.lastActivity).toLocaleString()}
                            </span>
                          ) : (
                            <span className="no-activity">No recent activity</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="no-users-message">No users found in current log entries.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeActiveUsersModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Old Logs Confirmation Modal */}
      {showClearLogsModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && cancelClearOldLogs()}>
          <div className="modal-content clear-logs-modal">
            <div className="modal-header">
              <h3>⚠️ Clear Old Audit Logs</h3>
              <button className="modal-close-btn" onClick={cancelClearOldLogs}>×</button>
            </div>
            <div className="modal-body">
              <div className="warning-message">
                <p><strong>⚠️ WARNING:</strong> This action will permanently delete all audit logs older than 6 months (180 days).</p>
                <p>This action cannot be undone!</p>
              </div>
              <div className="confirmation-section">
                <label htmlFor="confirm-text">Type <strong>"Confirm to delete Audit Log"</strong> to confirm:</label>
                <input
                  id="confirm-text"
                  type="text"
                  value={clearLogsConfirmText}
                  onChange={(e) => setClearLogsConfirmText(e.target.value)}
                  placeholder="Confirm to delete Audit Log"
                  className="confirmation-input"
                  disabled={isClearingLogs}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={cancelClearOldLogs}
                disabled={isClearingLogs}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={confirmClearOldLogs}
                disabled={clearLogsConfirmText !== 'Confirm to delete Audit Log' || isClearingLogs}
              >
                {isClearingLogs ? '🔄 Clearing...' : '🗑️ Clear Old Logs'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;