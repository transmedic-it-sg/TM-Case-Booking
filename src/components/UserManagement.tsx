import React, { useState, useEffect } from 'react';
import { User, COUNTRIES, DEPARTMENTS } from '../types';
import { getUsers, addUser, getCurrentUser } from '../utils/auth';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import MultiSelectDropdown from './MultiSelectDropdown';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showPasswordFor, setShowPasswordFor] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    name: '',
    role: 'admin' as 'admin' | 'operations' | 'operation-manager' | 'sales' | 'sales-manager' | 'driver' | 'it',
    departments: [] as string[],
    countries: [] as string[]
  });
  const [error, setError] = useState('');
  const [showRoleDescriptions, setShowRoleDescriptions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'admin';
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'it';
  
  const { addNotification } = useNotifications();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const allUsers = getUsers();
    
    // Filter users based on current user's role and country access
    if (currentUser?.role === 'it' && currentUser.selectedCountry) {
      // IT can only see users from their assigned country
      const filteredUsers = allUsers.filter(user => 
        (user.countries && user.countries.includes(currentUser.selectedCountry!)) || user.role === 'admin'
      );
      setUsers(filteredUsers);
    } else if (currentUser?.role === 'admin') {
      // Admin can see all users
      setUsers(allUsers);
    } else {
      setUsers(allUsers);
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
      countries: user.countries || []
    });
    setShowAddUser(true);
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

  const handleCancelEdit = () => {
    setEditingUser(null);
    setShowAddUser(false);
    setNewUser({
      username: '',
      password: '',
      name: '',
      role: 'admin',
      departments: [],
      countries: []
    });
    setError('');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newUser.username || !newUser.password || !newUser.name) {
      setError('All fields are required');
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
        role: 'admin',
        departments: [],
        countries: []
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

  if (!canManageUsers) {
    return (
      <div className="user-management">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access user management.</p>
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
        <button
          onClick={() => showAddUser ? handleCancelEdit() : setShowAddUser(true)}
          className="btn btn-primary btn-md add-user-button"
        >
          {showAddUser ? 'Cancel' : 'Add New User'}
        </button>
      </div>

      {showAddUser && (
        <div className="add-user-form">
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
                <label htmlFor="newRole" className="required">Role</label>
                <select
                  id="newRole"
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as 'admin' | 'operations' | 'operation-manager' | 'sales' | 'sales-manager' | 'driver' | 'it' }))}
                >
                  <option value="admin">Admin</option>
                  <option value="operations">Operations</option>
                  <option value="operation-manager">Operation Manager</option>
                  <option value="sales">Sales</option>
                  <option value="sales-manager">Sales Manager</option>
                  <option value="driver">Driver</option>
                  <option value="it">IT</option>
                </select>
              </div>

              <div className="form-group">
                <MultiSelectDropdown
                  id="newDepartments"
                  label="Departments"
                  options={DEPARTMENTS}
                  value={newUser.departments}
                  onChange={(values) => setNewUser(prev => ({ ...prev, departments: values }))}
                  placeholder="Select departments..."
                  required={false}
                />
              </div>
            </div>

            <div className="form-row">
              <MultiSelectDropdown
                id="newCountries"
                label="Countries"
                options={COUNTRIES}
                value={newUser.countries}
                onChange={(values) => setNewUser(prev => ({ ...prev, countries: values }))}
                placeholder="Select countries..."
                required={false}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-md submit-button">
                {editingUser ? 'Update User' : 'Add User'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-outline-secondary btn-md cancel-button"
              >
                Cancel
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
              <th>Role</th>
              <th>Department</th>
              <th>Countries</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentPageUsers().map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.name}</td>
                <td>
                  {user.role.replace('-', ' ').toUpperCase()}
                </td>
                <td>{user.departments ? user.departments.join(', ') : 'N/A'}</td>
                <td>{user.countries ? user.countries.join(', ') : 'N/A'}</td>
                <td>
                  {user.username !== 'Admin' && (
                    <div className="user-actions">
                      {(currentUser?.role === 'admin' || currentUser?.role === 'it') && (
                        <button 
                          className="btn btn-outline-secondary btn-sm" 
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </button>
                      )}
                      {(currentUser?.role === 'admin' || currentUser?.role === 'it') && (
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
            ))}
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

      <div className="role-descriptions">
        <div className="role-descriptions-header">
          <h3 onClick={() => setShowRoleDescriptions(!showRoleDescriptions)} className="collapsible-header">
            Role Descriptions
            <span className={`collapse-arrow ${showRoleDescriptions ? 'expanded' : ''}`}>▼</span>
          </h3>
        </div>
        {showRoleDescriptions && (
          <div className="role-descriptions-content">
            <div className="role-description">
              <strong>Admin:</strong>
              <ul>
                <li>Full access to all features</li>
                <li>Can manage users</li>
                <li>Can view, create, and process all cases</li>
                <li>Can change case statuses</li>
              </ul>
            </div>
            <div className="role-description">
              <strong>Operations:</strong>
              <ul>
                <li>Can create new case bookings</li>
                <li>Can view cases they submitted</li>
                <li>Can process orders assigned to them</li>
                <li>Limited status change permissions</li>
              </ul>
            </div>
            <div className="role-description">
              <strong>Sales & Sales Manager:</strong>
              <ul>
                <li>Department-specific case creation and viewing</li>
                <li>Can create cases for their assigned department</li>
                <li>Can view cases filtered by their department</li>
                <li>Limited to department-specific operations</li>
              </ul>
            </div>
            <div className="role-description">
              <strong>Driver & IT:</strong>
              <ul>
                <li>Driver: Can view delivery-related case information</li>
                <li>IT: Can manage users and technical system access</li>
                <li>Role-specific permissions and access levels</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;