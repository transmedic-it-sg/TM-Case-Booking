import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser } from '../utils/auth';
import { 
  getSupabaseUsers, 
  addSupabaseUser, 
  updateSupabaseUser, 
  deleteSupabaseUser, 
  toggleUserEnabled, 
  checkUsernameAvailable 
} from '../utils/supabaseUserService';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { 
  getCountries, 
  initializeCodeTables, 
  getDepartmentsForCountries
} from '../utils/codeTable';
import { getAllRoles } from '../data/permissionMatrixData';
import MultiSelectDropdown from './MultiSelectDropdown';
import SearchableDropdown from './SearchableDropdown';
import CountryGroupedDepartments from './CountryGroupedDepartments';
import RoleManagement from './RoleManagement';
import '../styles/department-management.css';

const UserManagement: React.FC = () => {
  const currentUser = getCurrentUser();
  
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: (currentUser?.role === 'admin' ? 'admin' : 'operations') as string,
    departments: [] as string[],
    countries: [] as string[],
    email: '',
    enabled: true
  });
  const [error, setError] = useState('');
  const [availableRoles, setAvailableRoles] = useState<Array<{value: string, label: string}>>([]);
  // Removed expandedUserBadges state - now using popup system instead of inline expansion
  const [popupData, setPopupData] = useState<{
    isOpen: boolean;
    type: 'departments' | 'countries' | null;
    items: string[];
    userName: string;
  }>({
    isOpen: false,
    type: null,
    items: [],
    userName: ''
  });
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>(''); // For previewing users by country
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(''); // For filtering by role
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>(''); // For filtering by status
  const [searchQuery, setSearchQuery] = useState<string>(''); // For searching users
  const [tempFilters, setTempFilters] = useState({searchQuery: '', selectedRoleFilter: '', selectedStatusFilter: '', selectedCountryFilter: ''}); // Temp filters for Apply button
  const [showFilters, setShowFilters] = useState(false); // Show/hide advanced filters
  // Removed expandedBadges and columnWidths - simplified table design
  // Removed availableDepartments since we now use CountryGroupedDepartments exclusively
  const canCreateUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CREATE_USER) : false;
  
  // Ref for the add user form to handle click outside
  const addUserFormRef = useRef<HTMLDivElement>(null);
  const canEditUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_USER) : false;
  const canEditCountries = currentUser ? hasPermission(currentUser.role, 'edit-countries') : false;
  const canDeleteUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_USER) : false;
  const canEnableDisableUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.ENABLE_DISABLE_USER) : false;
  
  const { addNotification } = useNotifications();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Cancel edit handler - defined before useEffect to avoid dependency issues
  const handleCancelEdit = useCallback(() => {
    setEditingUser(null);
    setShowAddUser(false);
    setNewUser({
      username: '',
      password: '',
      name: '',
      role: currentUser?.role === 'admin' ? 'admin' : 'operations',
      departments: [],
      countries: [],
      email: '',
      enabled: true
    });
    setError('');
  }, [currentUser?.role]);

  // ALL useEffect hooks MUST be called before any conditional returns
  useEffect(() => {
    initializeCodeTables();
    loadUsers();
    
    // Load countries from code tables
    setAvailableCountries(getCountries());
    
    // Load available roles
    loadAvailableRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Reload users when country filter changes
  useEffect(() => {
    loadUsers();
  }, [selectedCountryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle escape key to close add user form (removed click outside functionality)
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAddUser) {
        handleCancelEdit();
      }
    };

    // Always add the event listener, but only act when showAddUser is true
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAddUser, handleCancelEdit]);

  // Handle ESC key to close popup
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && popupData.isOpen) {
        handleClosePopup();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [popupData.isOpen]);

  const loadAvailableRoles = () => {
    const allRoles = getAllRoles();
    const roleOptions = allRoles.map(role => ({
      value: role.id,
      label: role.displayName
    }));

    // Filter roles based on current user's permissions
    const filteredRoles = currentUser?.role === 'admin' 
      ? roleOptions 
      : roleOptions.filter(role => role.value !== 'admin');

    setAvailableRoles(filteredRoles);
  };

  // Refresh roles when custom roles are updated
  const handleRoleUpdate = () => {
    loadAvailableRoles();
  };


  const loadUsers = async () => {
    try {
      const allUsers = await getSupabaseUsers();
      
      // Filter users based on current user's role and country access
      let filteredUsers = allUsers;
      
      if (currentUser?.role === 'it' && currentUser.selectedCountry) {
        // IT can only see users from their assigned country
        filteredUsers = allUsers.filter(user => 
          (user.countries && user.countries.includes(currentUser.selectedCountry!)) || user.role === 'admin'
        );
      } else if (currentUser?.role === 'admin') {
        // Admin can see all users
        filteredUsers = allUsers;
      }
      
      // Apply country filter if selected
      if (selectedCountryFilter) {
        filteredUsers = filteredUsers.filter(user => 
          user.countries && user.countries.includes(selectedCountryFilter)
        );
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      showError('Database Error', 'Failed to load users from database');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    setNewUser({
      username: user.username,
      password: user.password,
      name: user.name,
      role: user.role,
      departments: user.departments || [],
      countries: user.countries || [],
      email: user.email || '',
      enabled: user.enabled !== undefined ? user.enabled : true
    });
    setShowAddUser(true);
    
    // Scroll to the form after a brief delay to ensure it's rendered
    setTimeout(() => {
      const formElement = document.querySelector('.add-user-form');
      if (formElement) {
        formElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    const confirmMessage = `Are you sure you want to delete user "${userToDelete?.name}" (${userToDelete?.username})?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const success = await deleteSupabaseUser(userId);
        if (success) {
          loadUsers();
          
          playSound.delete();
          showSuccess('User Deleted', `User "${userToDelete?.name}" has been successfully removed from the system.`);
          addNotification({
            title: 'User Account Deleted',
            message: `${userToDelete?.name} (${userToDelete?.username}) has been removed from the user access matrix.`,
            type: 'warning'
          });
        } else {
          showError('Delete Failed', 'Failed to delete user. Please try again.');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        showError('Delete Failed', 'Failed to delete user. Please try again.');
      }
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) return;
    
    const newStatus = !currentStatus;
    const action = newStatus ? 'enabled' : 'disabled';
    const confirmMessage = `Are you sure you want to ${newStatus ? 'enable' : 'disable'} user "${userToToggle.name}" (${userToToggle.username})?\n\nThis will ${newStatus ? 'allow' : 'prevent'} them from logging into the system.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const success = await toggleUserEnabled(userId, newStatus);
        if (success) {
          loadUsers();
          
          playSound.success();
          showSuccess('User Status Updated', `User "${userToToggle.name}" has been ${action}.`);
          addNotification({
            title: `User Account ${newStatus ? 'Enabled' : 'Disabled'}`,
            message: `${userToToggle.name} (${userToToggle.username}) has been ${action} in the system.`,
            type: newStatus ? 'success' : 'warning'
          });
        } else {
          showError('Update Failed', 'Failed to update user status. Please try again.');
        }
      } catch (error) {
        console.error('Error updating user status:', error);
        showError('Update Failed', 'Failed to update user status. Please try again.');
      }
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUser.username || !newUser.password || !newUser.name) {
      setError('Username, password, and full name are required');
      return;
    }

    if (newUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Prevent non-admin users from creating admin accounts
    if (newUser.role === 'admin' && currentUser?.role !== 'admin') {
      setError('Only administrators can create admin accounts');
      return;
    }

    // Check username availability
    const isUsernameAvailable = await checkUsernameAvailable(newUser.username, editingUser || undefined);
    if (!isUsernameAvailable) {
      setError('Username already exists');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updatedUser = await updateSupabaseUser(editingUser, newUser);
        if (updatedUser) {
          loadUsers();
          
          playSound.success();
          showSuccess('User Updated', `${newUser.name}'s account has been successfully updated.`);
          addNotification({
            title: 'User Account Updated',
            message: `${newUser.name} (${newUser.username}) account details have been modified.`,
            type: 'success'
          });
        } else {
          setError('Failed to update user. Please try again.');
          return;
        }
      } else {
        // Add new user
        const createdUser = await addSupabaseUser(newUser);
        if (createdUser) {
          loadUsers();
          
          playSound.success();
          showSuccess('User Created', `Welcome ${newUser.name}! New user account has been created successfully.`);
          addNotification({
            title: 'New User Account Created',
            message: `${newUser.name} (${newUser.username}) has been added to the system with ${newUser.role} role.`,
            type: 'success'
          });
        } else {
          setError('Failed to create user. Please try again.');
          return;
        }
      }
      
      // Reset form
      setNewUser({
        username: '',
        password: '',
        name: '',
        role: currentUser?.role === 'admin' ? 'admin' : 'operations',
        departments: [],
        countries: [],
        email: '',
        enabled: true
      });
      setEditingUser(null);
      setShowAddUser(false);
    } catch (err) {
      console.error('Error saving user:', err);
      const errorMessage = editingUser ? 'Failed to update user' : 'Failed to add user';
      setError(errorMessage);
      playSound.error();
      showError('Operation Failed', errorMessage);
    }
  };

  // Check if user has permission to view users (this check is also done in App.tsx)
  const canViewUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.VIEW_USERS) : false;
  
  if (!canViewUsers) {
    return (
      <div className="permission-denied">
        <div className="permission-denied-content">
          <h2>🚫 Access Denied</h2>
          <p>You don't have permission to access user management.</p>
          <p>Contact your administrator to request access.</p>
        </div>
      </div>
    );
  }

  // Pagination helpers
  // Filter users based on search and filter criteria
  const getFilteredUsers = () => {
    return users.filter(user => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          user.username.toLowerCase().includes(query) ||
          user.name.toLowerCase().includes(query) ||
          (user.email && user.email.toLowerCase().includes(query)) ||
          user.role.toLowerCase().includes(query) ||
          (user.departments && user.departments.some(dept => dept.toLowerCase().includes(query))) ||
          (user.countries && user.countries.some(country => country.toLowerCase().includes(query)));
        
        if (!matchesSearch) return false;
      }
      
      // Role filter
      if (selectedRoleFilter && user.role !== selectedRoleFilter) {
        return false;
      }
      
      // Country filter
      if (selectedCountryFilter && (!user.countries || !user.countries.includes(selectedCountryFilter))) {
        return false;
      }
      
      // Status filter
      if (selectedStatusFilter) {
        const userEnabled = user.enabled !== undefined ? user.enabled : true;
        if (selectedStatusFilter === 'enabled' && !userEnabled) return false;
        if (selectedStatusFilter === 'disabled' && userEnabled) return false;
      }
      
      return true;
    });
  };

  const getCurrentPageUsers = () => {
    const filteredUsers = getFilteredUsers();
    // Show minimum 5 users, but allow scrolling if more
    return filteredUsers;
  };

  // Removed totalUsers as it's no longer displayed in table footer
  
  // Open popup to show all departments or countries
  const handleShowMore = (type: 'departments' | 'countries', items: string[], userName: string) => {
    setPopupData({
      isOpen: true,
      type,
      items,
      userName
    });
  };

  // Close popup
  const handleClosePopup = () => {
    setPopupData({
      isOpen: false,
      type: null,
      items: [],
      userName: ''
    });
  };

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>User Access Matrix</h2>
        <div className="admin-panel-buttons">
          {activeTab === 'users' && canCreateUsers && (
            <button
              onClick={() => showAddUser ? handleCancelEdit() : setShowAddUser(true)}
              className="btn btn-primary btn-md add-user-button"
            >
              {showAddUser ? 'Cancel' : 'Add New User'}
            </button>
          )}
        </div>
      </div>

      {/* Country Filter for User Preview */}
      {(currentUser?.role === 'admin' || currentUser?.role === 'it') && (
        <div className="country-filter-section">
          <div className="country-filter-header">
            <h3>🌍 Filter Users by Country:</h3>
            <p>Select a country to preview users assigned to that region</p>
          </div>
          <div className="country-filter-dropdown">
            <SearchableDropdown
              options={['All Countries', ...(currentUser?.countries || [])]}
              value={selectedCountryFilter || 'All Countries'}
              onChange={(value) => setSelectedCountryFilter(value === 'All Countries' ? '' : value)}
              placeholder="Select country to filter users..."
              className="country-filter-select"
            />
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          🎭 Role Management
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="tab-content">
          {showAddUser && (
        <div className="add-user-form" ref={addUserFormRef}>
          <h3>{editingUser ? 'Edit User' : 'Add New User'}</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newUsername" className="required">Username</label>
                <input
                  type="text"
                  id="newUsername"
                  value={newUser.username}
                  onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword" className="required">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPasswordFor === 'new' ? 'text' : 'password'}
                    id="newPassword"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-user"
                    onClick={() => setShowPasswordFor(showPasswordFor === 'new' ? null : 'new')}
                    aria-label={showPasswordFor === 'new' ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordFor === 'new' ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newName" className="required">Full Name</label>
                <input
                  type="text"
                  id="newName"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="newEmail">Email Address</label>
                <input
                  type="email"
                  id="newEmail"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="newRole" className="required">Role</label>
                <SearchableDropdown
                  options={availableRoles}
                  value={newUser.role}
                  onChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                  placeholder="Select Role"
                />
              </div>

              {canEditCountries && (
                <div className="form-group">
                  <MultiSelectDropdown
                    id="newCountries"
                    label="Countries"
                    options={availableCountries}
                    value={newUser.countries}
                    onChange={(values) => {
                      // Get valid departments for the selected countries
                      const validDepartmentsForCountries = values.length > 0 ? getDepartmentsForCountries(values) : [];
                      
                      // Filter out departments that don't exist in the selected countries
                      const validDepartments = newUser.departments.filter(dept => 
                        validDepartmentsForCountries.includes(dept)
                      );
                      
                      setNewUser(prev => ({ 
                        ...prev, 
                        countries: values,
                        departments: validDepartments
                      }));
                    }}
                    placeholder="Select countries..."
                    required={false}
                  />
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="userEnabled">User Status</label>
                <div className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="userEnabled"
                    checked={newUser.enabled}
                    onChange={(e) => setNewUser(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <label htmlFor="userEnabled" className="checkbox-label">
                    {newUser.enabled ? 'Account Enabled' : 'Account Disabled'}
                  </label>
                </div>
                <small className="form-helper-text">
                  {newUser.enabled 
                    ? 'User can log in and access the system' 
                    : 'User cannot log in (account disabled)'
                  }
                </small>
              </div>
            </div>

            {/* Departments - Now as the last field, full width */}
            <div className="form-row">
              <div className="form-group form-group-full">
                <label>Departments</label>
                <p className="form-helper-text departments-hint">
                  Select departments for the assigned countries. Departments are organised by country.
                </p>
                <CountryGroupedDepartments
                  selectedDepartments={newUser.departments}
                  onChange={(departments) => {
                    // CountryGroupedDepartments always sends country-specific format, no migration needed
                    setNewUser(prev => ({ ...prev, departments }));
                  }}
                  userCountries={newUser.countries}
                  compact={true}
                />
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-outline-secondary btn-lg cancel-button"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-lg submit-button">
                {editingUser ? 'Update User' : 'Add User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="users-table">
        <div className="users-table-header">
          <h3>Existing Users ({getFilteredUsers().length})</h3>
          
          {/* Modern Advanced Filters - Similar to View All Cases */}
          <div className="modern-filters-section">
            <div className="filters-header" onClick={() => setShowFilters(!showFilters)}>
              <div className="filters-title">
                <h3>🔍 Advanced Filters</h3>
                <span className="active-filters-count">
                  {(searchQuery || selectedRoleFilter || selectedCountryFilter || selectedStatusFilter) && 
                    `(${[searchQuery, selectedRoleFilter, selectedCountryFilter, selectedStatusFilter].filter(Boolean).length} active)`}
                </span>
              </div>
              <button className={`btn btn-outline-secondary btn-sm filters-toggle ${showFilters ? 'expanded' : ''}`}>
                {showFilters ? '▲' : '▼'}
              </button>
            </div>
            
            {showFilters && (
              <div className="filters-content">
                <div className="filters-grid">
                  {/* Search Filter */}
                  <div className="filter-category">
                    <h4>🔎 Search</h4>
                    <div className="filter-row">
                      <div className="modern-filter-group full-width">
                        <label>Search Users</label>
                        <div className="filter-input-wrapper">
                          <input
                            type="text"
                            placeholder="Search users, roles, departments, countries..."
                            value={tempFilters.searchQuery}
                            onChange={(e) => setTempFilters(prev => ({...prev, searchQuery: e.target.value}))}
                            className="modern-filter-input"
                          />
                          <span className="filter-icon">👤</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Role & Status Filters */}
                  <div className="filter-category">
                    <h4>🎭 Role & Status</h4>
                    <div className="filter-row" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))'}}>
                      <div className="modern-filter-group">
                        <label>Role</label>
                        <div className="filter-input-wrapper">
                          <select
                            value={tempFilters.selectedRoleFilter}
                            onChange={(e) => setTempFilters(prev => ({...prev, selectedRoleFilter: e.target.value}))}
                            className="modern-filter-select"
                          >
                            <option value="">All Roles</option>
                            {availableRoles.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          <span className="filter-icon">🎭</span>
                        </div>
                      </div>
                      
                      <div className="modern-filter-group">
                        <label>Status</label>
                        <div className="filter-input-wrapper">
                          <select
                            value={tempFilters.selectedStatusFilter}
                            onChange={(e) => setTempFilters(prev => ({...prev, selectedStatusFilter: e.target.value}))}
                            className="modern-filter-select"
                          >
                            <option value="">All Status</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                          </select>
                          <span className="filter-icon">📊</span>
                        </div>
                      </div>
                      
                      <div className="modern-filter-group">
                        <label>Country</label>
                        <div className="filter-input-wrapper">
                          <select
                            value={tempFilters.selectedCountryFilter}
                            onChange={(e) => setTempFilters(prev => ({...prev, selectedCountryFilter: e.target.value}))}
                            className="modern-filter-select"
                          >
                            <option value="">All Countries</option>
                            {availableCountries.map(country => (
                              <option key={country} value={country}>{country}</option>
                            ))}
                          </select>
                          <span className="filter-icon">🌍</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Actions */}
                <div className="modern-filter-actions">
                  <div className="filter-stats">
                    Showing {getFilteredUsers().length} of {users.length} users
                  </div>
                  <div className="filter-buttons">
                    <button 
                      onClick={() => {
                        setTempFilters({searchQuery: '', selectedRoleFilter: '', selectedStatusFilter: '', selectedCountryFilter: ''});
                        setSearchQuery('');
                        setSelectedRoleFilter('');
                        setSelectedStatusFilter('');
                        setSelectedCountryFilter('');
                        // Badge view is now handled by popup system - no reset needed
                      }}
                      className="btn btn-outline-secondary btn-md modern-clear-button"
                      disabled={!tempFilters.searchQuery && !tempFilters.selectedRoleFilter && !tempFilters.selectedStatusFilter && !tempFilters.selectedCountryFilter}
                    >
                      🗑️ Clear All
                    </button>
                    <button 
                      onClick={() => {
                        setSearchQuery(tempFilters.searchQuery);
                        setSelectedRoleFilter(tempFilters.selectedRoleFilter);
                        setSelectedStatusFilter(tempFilters.selectedStatusFilter);
                        setSelectedCountryFilter(tempFilters.selectedCountryFilter);
                        // Badge view is now handled by popup system - no reset needed
                      }}
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
                    onClick={() => {
                      setTempFilters(prev => ({...prev, selectedRoleFilter: 'admin'}));
                    }}
                    className="btn btn-outline-secondary btn-sm quick-filter-button"
                  >
                    👑 Admin Users
                  </button>
                  <button 
                    onClick={() => {
                      setTempFilters(prev => ({...prev, selectedStatusFilter: 'enabled'}));
                    }}
                    className="btn btn-outline-secondary btn-sm quick-filter-button"
                  >
                    ✅ Enabled Only
                  </button>
                  <button 
                    onClick={() => {
                      setTempFilters(prev => ({...prev, selectedStatusFilter: 'disabled'}));
                    }}
                    className="btn btn-outline-secondary btn-sm quick-filter-button"
                  >
                    🚫 Disabled Only
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Full Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Countries</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentPageUsers().map(user => {
              const userEnabled = user.enabled !== undefined ? user.enabled : true;
              return (
                <tr key={user.id} className={!userEnabled ? 'user-disabled' : ''}>
                  <td>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.email || 'N/A'}</td>
                  <td>
                    <span className={`badge badge-role badge-role-${user.role}`}>
                      {user.role.replace(/-/g, ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="department-column">
                    <div className="badge-container-vertical">
                      {user.departments && user.departments.length > 0 ? (
                        <>
                          <div className="badge-grid">
                            {user.departments.slice(0, 4).map((dept, index) => (
                              <span key={index} className="badge badge-department" title={dept}>
                                {dept}
                              </span>
                            ))}
                          </div>
                          {user.departments.length > 4 && (
                            <button
                              className="badge badge-expandable"
                              onClick={() => handleShowMore('departments', user.departments!, user.name)}
                              title="Show all departments"
                            >
                              +{user.departments.length - 4} more
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">No departments</span>
                      )}
                    </div>
                  </td>
                  <td className="countries-column">
                    <div className="badge-container-vertical">
                      {user.countries && user.countries.length > 0 ? (
                        <>
                          <div className="badge-grid">
                            {user.countries.slice(0, 4).map((country, index) => (
                              <span key={index} className="badge badge-country" title={country}>
                                {country}
                              </span>
                            ))}
                          </div>
                          {user.countries.length > 4 && (
                            <button
                              className="badge badge-expandable"
                              onClick={() => handleShowMore('countries', user.countries!, user.name)}
                              title="Show all countries"
                            >
                              +{user.countries.length - 4} more
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-muted">No countries</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`user-status ${userEnabled ? 'enabled' : 'disabled'}`}>
                      {userEnabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    {user.username !== 'Admin' && (
                      <div className="user-actions vertical">
                        {canEditUsers && (
                          <button 
                            className="btn btn-outline-secondary btn-sm" 
                            onClick={() => handleEditUser(user)}
                          >
                            Edit
                          </button>
                        )}
                        {canEnableDisableUsers && (
                          <button 
                            className={`btn btn-sm ${userEnabled ? 'btn-warning' : 'btn-success'}`}
                            onClick={() => handleToggleUserStatus(user.id, userEnabled)}
                            title={userEnabled ? 'Disable User' : 'Enable User'}
                          >
                            {userEnabled ? 'Disable' : 'Enable'}
                          </button>
                        )}
                        {canDeleteUsers && (
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
      </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="tab-content">
          <RoleManagement onRoleUpdate={handleRoleUpdate} />
        </div>
      )}

      {/* Popup for showing all departments/countries */}
      {popupData.isOpen && (
        <div className="popup-overlay" onClick={handleClosePopup}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>
                {popupData.type === 'departments' ? 'All Departments' : 'All Countries'} - {popupData.userName}
              </h3>
              <button className="popup-close" onClick={handleClosePopup}>
                ✕
              </button>
            </div>
            <div className="popup-body">
              <div className="popup-badge-grid">
                {popupData.items.map((item, index) => (
                  <span 
                    key={index} 
                    className={`badge ${popupData.type === 'departments' ? 'badge-department' : 'badge-country'}`}
                    title={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="popup-footer">
              <p className="popup-info">Press ESC or click outside to close</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;