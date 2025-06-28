import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { getUsers, addUser, getCurrentUser } from '../utils/auth';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { 
  getCountries, 
  initializeCodeTables, 
  getDepartmentsForCountries,
  migrateDepartmentsToCountrySpecific,
  isCountrySpecificDepartment 
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
  const [currentPage, setCurrentPage] = useState(1);
  const [availableRoles, setAvailableRoles] = useState<Array<{value: string, label: string}>>([]);
  const [usersPerPage] = useState(10);
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>(''); // For previewing users by country
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

  // Handle escape key to close add user form (removed click outside functionality)
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showAddUser) {
        handleCancelEdit();
      }
    };

    if (showAddUser) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showAddUser, handleCancelEdit]);

  const loadUsers = () => {
    const allUsers = getUsers();
    
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

  const handleDeleteUser = (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    const confirmMessage = `Are you sure you want to delete user "${userToDelete?.name}" (${userToDelete?.username})?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      const updatedUsers = users.filter(u => u.id !== userId);
      localStorage.setItem('case-booking-users', JSON.stringify(updatedUsers));
      loadUsers();
      
      playSound.delete();
      showSuccess('User Deleted', `User "${userToDelete?.name}" has been successfully removed from the system.`);
      addNotification({
        title: 'User Account Deleted',
        message: `${userToDelete?.name} (${userToDelete?.username}) has been removed from the user access matrix.`,
        type: 'warning'
      });
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) return;
    
    const newStatus = !currentStatus;
    const action = newStatus ? 'enabled' : 'disabled';
    const confirmMessage = `Are you sure you want to ${newStatus ? 'enable' : 'disable'} user "${userToToggle.name}" (${userToToggle.username})?\n\nThis will ${newStatus ? 'allow' : 'prevent'} them from logging into the system.`;
    
    if (window.confirm(confirmMessage)) {
      const updatedUsers = users.map(u => 
        u.id === userId 
          ? { ...u, enabled: newStatus }
          : u
      );
      localStorage.setItem('case-booking-users', JSON.stringify(updatedUsers));
      loadUsers();
      
      playSound.success();
      showSuccess('User Status Updated', `User "${userToToggle.name}" has been ${action}.`);
      addNotification({
        title: `User Account ${newStatus ? 'Enabled' : 'Disabled'}`,
        message: `${userToToggle.name} (${userToToggle.username}) has been ${action} in the system.`,
        type: newStatus ? 'success' : 'warning'
      });
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
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

    const existingUser = users.find(u => u.username === newUser.username && u.id !== editingUser);
    if (existingUser) {
      setError('Username already exists');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updatedUsers = users.map(u => 
          u.id === editingUser 
            ? { ...u, ...newUser }
            : u
        );
        localStorage.setItem('case-booking-users', JSON.stringify(updatedUsers));
        
        playSound.success();
        showSuccess('User Updated', `${newUser.name}'s account has been successfully updated.`);
        addNotification({
          title: 'User Account Updated',
          message: `${newUser.name} (${newUser.username}) account details have been modified.`,
          type: 'success'
        });
      } else {
        // Add new user
        addUser(newUser);
        
        playSound.success();
        showSuccess('User Created', `Welcome ${newUser.name}! New user account has been created successfully.`);
        addNotification({
          title: 'New User Account Created',
          message: `${newUser.name} (${newUser.username}) has been added to the system with ${newUser.role} role.`,
          type: 'success'
        });
      }
      
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
      loadUsers();
    } catch (err) {
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
  const getCurrentPageUsers = () => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return users.slice(indexOfFirstUser, indexOfLastUser);
  };

  const totalPages = Math.ceil(users.length / usersPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
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
              options={['All Countries', ...availableCountries]}
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
                    // Ensure departments are in the new country-specific format
                    const migratedDepartments = departments.every(dept => isCountrySpecificDepartment(dept))
                      ? departments
                      : migrateDepartmentsToCountrySpecific(departments, newUser.countries);
                    
                    setNewUser(prev => ({ ...prev, departments: migratedDepartments }));
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
        <h3>Existing Users</h3>
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
                    {user.role.replace(/-/g, ' ').toUpperCase()}
                  </td>
                  <td>{user.departments ? user.departments.join(', ') : 'N/A'}</td>
                  <td>{user.countries ? user.countries.join(', ') : 'N/A'}</td>
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
        
        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination-info">
              Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, users.length)} of {users.length} users
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
      )}

      {activeTab === 'roles' && (
        <div className="tab-content">
          <RoleManagement onRoleUpdate={handleRoleUpdate} />
        </div>
      )}

    </div>
  );
};

export default UserManagement;