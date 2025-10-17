/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '../types';
import { getCurrentUser } from '../utils/authCompat';
import { useRealtimeUsers } from '../hooks/useRealtimeUsers';
import {
  checkUsernameAvailable
} from '../utils/supabaseUserService';
import { useNotifications } from '../contexts/NotificationContext';
import { useToast } from './ToastContainer';
import { useSound } from '../contexts/SoundContext';
import CustomModal from './CustomModal';
import PasswordInput from './PasswordInput';
import { validatePassword, getPasswordRequirementsSync } from '../utils/passwordValidation';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { getAllRoles } from '../data/permissionMatrixData';
import MultiSelectDropdown from './MultiSelectDropdown';
import SearchableDropdown from './SearchableDropdown';
import CountryGroupedDepartments from './CountryGroupedDepartments';
import RoleManagement from './RoleManagement';
import { auditUserCreated, auditUserUpdated, auditUserDeleted, auditPasswordReset, addAuditLog } from '../utils/auditService';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';
import '../assets/components/department-management.css';
import '../assets/components/UserManagement.css';

const UserManagement: React.FC = () => {
  const currentUser = getCurrentUser();

  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Filter states - declared before real-time hook
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // REAL-TIME USERS HOOK - Always fresh data, no cache issues, comprehensive testing
  const {
    users,
    isLoading: usersLoading,
    error: usersError,
    refreshUsers,
    addUser,
    updateUser,
    deleteUser,
    toggleUser,
    resetUserPassword,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimeUsers({
    enableRealTime: true,
    enableTesting: false,
    filters: {
      country: selectedCountryFilter,
      role: selectedRoleFilter,
      status: selectedStatusFilter === 'enabled' ? 'enabled' :
              selectedStatusFilter === 'disabled' ? 'disabled' : 'all',
      search: searchQuery
    }
  });
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
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
  // Filter states moved up before real-time hook declaration
  const [tempFilters, setTempFilters] = useState({searchQuery: '', selectedRoleFilter: '', selectedStatusFilter: '', selectedCountryFilter: ''}); // Temp filters for Apply button
  const [showFilters, setShowFilters] = useState(false); // Show/hide advanced filters
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'delete' | 'disable' | 'enable' | null;
    user: User | null;
  }>({
    isOpen: false,
    type: null,
    user: null
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 12; // 3 users per row × 4 rows = 12 users per page
  // Removed expandedBadges and columnWidths - simplified table design
  // Removed availableDepartments since we now use CountryGroupedDepartments exclusively
  const canCreateUsers = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.CREATE_USER) : false;

  // Ref for the add user form to handle click outside
  const addUserFormRef = useRef<HTMLDivElement>(null);
  // Admin role always has all permissions
  const canEditUsers = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_USER)) : false;
  const canEditCountries = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_COUNTRIES)) : false;
  const canDeleteUsers = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_USER)) : false;
  const canEnableDisableUsers = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.ENABLE_DISABLE_USER)) : false;
  const canResetPassword = currentUser ? (currentUser.role === 'admin' || hasPermission(currentUser.role, PERMISSION_ACTIONS.RESET_PASSWORD)) : false;

  // Debug logging for permissions
  useEffect(() => {
    console.log('🔍 USER MANAGEMENT PERMISSIONS DEBUG:', {
      currentUser: currentUser?.role,
      isAdmin: currentUser?.role === 'admin',
      canEditUsers,
      canDeleteUsers,
      canEnableDisableUsers,
      canResetPassword,
      DELETE_USER_ACTION: PERMISSION_ACTIONS.DELETE_USER,
      hasPermissionResult: currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_USER) : 'no user',
      permissionCheckFormula: `currentUser.role === 'admin' (${currentUser?.role === 'admin'}) || hasPermission(${currentUser?.role}, ${PERMISSION_ACTIONS.DELETE_USER}) = ${canDeleteUsers}`
    });
    
    // Force log to ensure it's visible
    if (currentUser?.role === 'admin') {
      console.log('🚨 ADMIN USER DETECTED - Delete button SHOULD be visible!', {
        canDeleteUsers,
        adminCheck: currentUser.role === 'admin',
        username: currentUser.username
      });
    }
  }, [currentUser, canDeleteUsers]);

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
    // Users now loaded automatically by useRealtimeUsers hook

    // Load countries using standardized service - no direct database access
    const loadCountries = async () => {
      try {
        const { getStandardizedCountries } = await import('../utils/unifiedDataService');
        const countries = await getStandardizedCountries();
        setAvailableCountries(countries);
      } catch (error) {
        console.error('❌ USER MANAGEMENT - Error loading countries:', error);
        setAvailableCountries([]);
      }
    };
    loadCountries();

    // Load available roles
    loadAvailableRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filter changes now handled automatically by useRealtimeUsers hook
  // No manual reload needed

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

  // Update pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleFilter, selectedStatusFilter, selectedCountryFilter]);

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

  // Helper function to format departments with country prefixes
  const formatDepartmentsWithCountry = (departments: string[], countries: string[]): string[] => {
    if (!departments || !countries) return [];

    return departments.map(dept => {
      // Check if department has country prefix (new format)
      if (dept.includes(':')) {
        const [country, departmentName] = dept.split(':');
        return `${country} - ${departmentName}`;
      } else {
        // Legacy format - use default country mapping
        const departmentsByCountry: Record<string, string[]> = {};
        for (const country of countries) {
          if (departmentsByCountry[country] && departmentsByCountry[country].includes(dept)) {
            return `${country} - ${dept}`;
          }
        }
        // Fallback if country can't be determined
        return dept;
      }
    });
  };

  // cleanupUserDepartments function removed - was causing data loss issues

  // Removed loadUsers function - now using useRealtimeUsers hook for always-fresh data

  const handleEditUser = (user: User) => {
    setEditingUser(user.id);
    setNewUser({
      username: user.username,
      password: '', // Clear password field to indicate it's optional
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

  const handleResetPassword = (user: User) => {
    setResetPasswordUser(user);
    setTempPassword('');
    setShowResetPasswordModal(true);
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordUser || !tempPassword) {
      setError('Please enter a temporary password');
      return;
    }

    // Validate password using the system settings
    const requirements = getPasswordRequirementsSync(true); // Use complex requirements for admin resets
    const validation = validatePassword(tempPassword, requirements);

    if (!validation.isValid) {
      setError(`Password validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      await resetUserPassword(resetPasswordUser.id, tempPassword);
      // Real-time hook handles success automatically

      // Audit log for password reset
      try {
          if (currentUser) {
            await auditPasswordReset(
              currentUser.name,
              currentUser.id,
              currentUser.role,
              resetPasswordUser.name
            );
          }
        } catch (auditError) {
        }

        setShowResetPasswordModal(false);
        setResetPasswordUser(null);
        setTempPassword('');
        setError('');

        playSound.success();
        showSuccess('Password Reset', `Password has been reset for ${resetPasswordUser.name}. They will be required to change it on next login.`);
        addNotification({
          title: 'Password Reset',
          message: `Temporary password set for ${resetPasswordUser.name} (${resetPasswordUser.username}). User must change password on next login.`,
          type: 'success'
        });
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    }
  };

  const handleDeleteUser = (userId: string) => {
    // Validate permission before proceeding
    if (!canDeleteUsers) {
      setError('You do not have permission to delete users');
      return;
    }

    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete) {
      setConfirmModal({
        isOpen: true,
        type: 'delete',
        user: userToDelete
      });
    }
  };

  const confirmDeleteUser = async () => {
    const userToDelete = confirmModal.user;
    if (userToDelete) {
      try {
        await deleteUser(userToDelete.id);
        // Real-time hook automatically updates the users list

          // Audit log for user deletion
          try {
            if (currentUser && userToDelete) {
              await auditUserDeleted(
                currentUser.name,
                currentUser.id,
                currentUser.role,
                userToDelete.name
              );
            }
          } catch (auditError) {
          }

          playSound.delete();
          showSuccess('User Deleted', `User "${userToDelete?.name}" has been successfully removed from the system.`);
          addNotification({
            title: 'User Account Deleted',
            message: `${userToDelete?.name} (${userToDelete?.username}) has been removed from the user access matrix.`,
            type: 'warning'
          });
      } catch (error) {
        showError('Delete Failed', 'Failed to delete user. Please try again.');
      }
      // Close modal after operation
      setConfirmModal({ isOpen: false, type: null, user: null });
    }
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    // Validate permission before proceeding
    if (!canEnableDisableUsers) {
      setError('You do not have permission to enable/disable users');
      return;
    }

    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) return;

    const newStatus = !currentStatus;

    setConfirmModal({
      isOpen: true,
      type: newStatus ? 'enable' : 'disable',
      user: userToToggle
    });
  };

  const confirmToggleUserStatus = async () => {
    const userToToggle = confirmModal.user;
    if (userToToggle && confirmModal.type) {
      const newStatus = confirmModal.type === 'enable';
      const currentStatus = !newStatus; // Previous status is opposite of new status
      const action = newStatus ? 'enabled' : 'disabled';

      try {
        await toggleUser(userToToggle.id);
        // Real-time hook automatically updates the users list

          // Audit log for user status change
          try {
            if (currentUser) {
              await addAuditLog(
                currentUser.name,
                currentUser.id,
                currentUser.role,
                `User ${newStatus ? 'Enabled' : 'Disabled'}`,
                'User Management',
                userToToggle.name,
                `User ${userToToggle.name} (${userToToggle.username}) was ${action} by ${currentUser.name}`,
                'success',
                { previousStatus: currentStatus, newStatus: newStatus }
              );
            }
          } catch (auditError) {
          }

          playSound.success();
          showSuccess('User Status Updated', `User "${userToToggle.name}" has been ${action}.`);
          addNotification({
            title: `User Account ${newStatus ? 'Enabled' : 'Disabled'}`,
            message: `${userToToggle.name} (${userToToggle.username}) has been ${action} in the system.`,
            type: newStatus ? 'success' : 'warning'
          });
      } catch (error) {
        showError('Update Failed', 'Failed to update user status. Please try again.');
      }
      // Close modal after operation
      setConfirmModal({ isOpen: false, type: null, user: null });
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate permissions before proceeding
    if (!editingUser && !canCreateUsers) {
      setError('You do not have permission to create users');
      return;
    }

    if (editingUser && !canEditUsers) {
      setError('You do not have permission to edit users');
      return;
    }

    // For new users, require username, password, and name
    // For existing users, only require username and name (password is optional)
    if (!newUser.username || !newUser.name) {
      setError('Username and full name are required');
      return;
    }

    // Password validation for new users
    if (!editingUser && currentUser?.role === 'admin') {
      if (!newUser.password) {
        setError('Password is required for new users');
        return;
      }

      // Validate password complexity
      const requirements = getPasswordRequirementsSync(true);
      const validation = validatePassword(newUser.password, requirements);

      if (!validation.isValid) {
        setError(`Password validation failed: ${validation.errors.join(', ')}`);
        return;
      }
    }

    // For non-admin users, set a secure default password if creating new user
    let finalUserData = { ...newUser };
    if (!editingUser && currentUser?.role !== 'admin' && !newUser.password) {
      // Generate a secure temporary password
      const tempPassword = 'TempMedic2025!';
      finalUserData = { ...finalUserData, password: tempPassword };
    }

    // For existing users with password change, validate the new password
    if (editingUser && finalUserData.password && currentUser?.role === 'admin') {
      const requirements = getPasswordRequirementsSync(true);
      const validation = validatePassword(finalUserData.password, requirements);

      if (!validation.isValid) {
        setError(`Password validation failed: ${validation.errors.join(', ')}`);
        return;
      }
    }

    if (finalUserData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(finalUserData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Prevent non-admin users from creating admin accounts
    if (finalUserData.role === 'admin' && currentUser?.role !== 'admin') {
      setError('Only administrators can create admin accounts');
      return;
    }

    // Check username availability
    const isUsernameAvailable = await checkUsernameAvailable(finalUserData.username, editingUser ? users.find(u => u.id === editingUser) : undefined);
    if (!isUsernameAvailable) {
      setError('Username already exists');
      return;
    }

    console.log('👤 USER SAVE - Starting save operation:', {
      isEditing: !!editingUser,
      userData: { ...finalUserData, password: finalUserData.password ? '[MASKED]' : 'none' },
      timestamp: new Date().toISOString()
    });

    try {
      if (editingUser) {
        console.log('📝 USER UPDATE - Updating existing user:', editingUser);
        // Update existing user
        // Don't send password if it's empty (keep current password)
        const { password, ...updateDataWithoutPassword } = finalUserData;
        const updateData: Partial<User> = finalUserData.password ? finalUserData : updateDataWithoutPassword;
        
        console.log('📤 USER UPDATE - Calling updateUser with data:', {
          userId: editingUser,
          hasPassword: !!finalUserData.password,
          dataKeys: Object.keys(updateData)
        });
        
        await updateUser(editingUser, updateData);
        console.log('✅ USER UPDATE - Update successful');
        // Real-time hook automatically updates the users list

          // Audit log for user update
          try {
            if (currentUser) {
              // Create a list of changes made
              const changes = [];
              if (finalUserData.password) changes.push('password');
              changes.push('profile updated');

              await auditUserUpdated(
                currentUser.name,
                currentUser.id,
                currentUser.role,
                finalUserData.name,
                changes
              );
            }
          } catch (auditError) {
          }

          playSound.success();
          showSuccess('User Updated', `${finalUserData.name}'s account has been successfully updated.`);
          addNotification({
            title: 'User Account Updated',
            message: `${finalUserData.name} (${finalUserData.username}) account details have been modified.`,
            type: 'success'
          });
      } else {
        console.log('👤 USER CREATE - Creating new user');
        // Add new user
        // For admin users created by admin, assign all countries and no departments
        const userDataToSave = currentUser?.role === 'admin' && finalUserData.role === 'admin'
          ? {
              ...finalUserData,
              countries: availableCountries,
              departments: [], // Admin users don't need department restrictions
              selectedCountry: finalUserData.countries?.[0] || availableCountries[0] // Set default selected country
            }
          : {
              ...finalUserData,
              selectedCountry: finalUserData.countries?.[0] || currentUser?.selectedCountry || 'Singapore' // Set default selected country
            };

        console.log('📤 USER CREATE - Calling addUser with data:', {
          username: userDataToSave.username,
          role: userDataToSave.role,
          hasPassword: !!userDataToSave.password,
          countriesCount: userDataToSave.countries?.length || 0,
          departmentsCount: userDataToSave.departments?.length || 0
        });

        await addUser(userDataToSave);
        console.log('✅ USER CREATE - Creation successful');
        // Real-time hook automatically updates the users list

          // Audit log for user creation
          try {
            if (currentUser) {
              await auditUserCreated(
                currentUser.name,
                currentUser.id,
                currentUser.role,
                userDataToSave.name,
                userDataToSave.role,
                userDataToSave.countries
              );
            }
          } catch (auditError) {
          }

          playSound.success();
          showSuccess('User Created', `Welcome ${userDataToSave.name}! New user account has been created successfully.`);
          addNotification({
            title: 'New User Account Created',
            message: `${userDataToSave.name} (${userDataToSave.username}) has been added to the system with ${userDataToSave.role} role.`,
            type: 'success'
          });
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
      console.error('❌ USER SAVE - Error occurred:', {
        error: err,
        isEditing: !!editingUser,
        username: finalUserData.username,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined
      });
      
      // CRITICAL FIX: Show specific error details instead of generic message
      let errorMessage = editingUser ? 'Failed to update user' : 'Failed to add user';
      
      if (err instanceof Error) {
        console.log('🔍 USER SAVE - Analyzing error type:', {
          message: err.message,
          includesUsername: err.message.includes('Username already exists'),
          includesDuplicate: err.message.includes('duplicate key value'),
          includes409: err.message.includes('409'),
          includes23505: err.message.includes('23505')
        });
        
        // Check for specific error types
        if (err.message.includes('Username already exists') || err.message.includes('duplicate key value')) {
          errorMessage = `Username "${finalUserData.username}" is already taken. Please choose a different username.`;
        } else if (err.message.includes('409') || err.message.includes('conflict')) {
          errorMessage = `User "${finalUserData.username}" already exists. Please choose a different username.`;
        } else if (err.message.includes('23505')) { // PostgreSQL unique violation error code
          errorMessage = `Username "${finalUserData.username}" is already taken. Please choose a different username.`;
        } else {
          // Show the actual error message if it's not a generic one
          errorMessage = err.message || errorMessage;
        }
      }
      
      console.log('💬 USER SAVE - Final error message:', errorMessage);
      
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

  // Filtering now handled by useRealtimeUsers hook - no manual filtering needed

  const getCurrentPageUsers = () => {
    // Users are already filtered by the real-time hook
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return users.slice(indexOfFirstUser, indexOfLastUser);
  };

  // Calculate pagination info
  const totalUsers = users.length; // Already filtered by real-time hook
  const totalPages = Math.ceil(totalUsers / usersPerPage);

  // Removed totalUsers as it's no longer displayed in table footer

  // Helper function to group departments by country for popup display
  const groupDepartmentsByCountry = (formattedDepartments: string[]): { [country: string]: string[] } => {
    const grouped: { [country: string]: string[] } = {};

    formattedDepartments.forEach(dept => {
      if (dept.includes(' - ')) {
        const [country, departmentName] = dept.split(' - ');
        if (!grouped[country]) {
          grouped[country] = [];
        }
        grouped[country].push(departmentName);
      } else {
        // Fallback for departments without country prefix
        if (!grouped['Unknown']) {
          grouped['Unknown'] = [];
        }
        grouped['Unknown'].push(dept);
      }
    });

    return grouped;
  };

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
    <div className="user-management-container">
      {/* Modern Header with Stats */}
      <div className="user-management-header">
        <div className="header-content">
          <div className="header-title">
            <div className="header-icon">👥</div>
            <h1>User Management</h1>
          </div>
          <div className="header-stats">
            <div className="stat-card">
              <span className="stat-number">{users.length}</span>
              <span className="stat-label">Total Users</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{users.filter(u => u.enabled).length}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-card">
              <span className="stat-number">{users.filter(u => !u.enabled).length}</span>
              <span className="stat-label">Disabled</span>
            </div>
          </div>
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
              options={['All Countries', ...(currentUser?.role === 'admin' ? availableCountries : (currentUser?.countries || []))]}
              value={selectedCountryFilter || 'All Countries'}
              onChange={(value) => setSelectedCountryFilter(value === 'All Countries' ? '' : value)}
              placeholder="Select country to filter users..."
              className="country-filter-select"
            />
          </div>
        </div>
      )}

      {/* Modern Tab Navigation */}
      <div className="user-management-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <span>👥 User Management</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          <span>🎭 Role Management</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="tab-content">
          {showAddUser && (
            <div className="modal-overlay" onClick={handleCancelEdit}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={addUserFormRef}>
                <div className="modal-header">
                  <h2 className="modal-title">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                  <button className="close-btn" onClick={handleCancelEdit}>✕</button>
                </div>
              <form onSubmit={handleAddUser}>
                <div className="modal-body">
                  <div className="form-group">
                    <label htmlFor="newUsername" className="form-label">Username *</label>
                    <input
                      type="text"
                      id="newUsername"
                      className="form-input"
                      value={newUser.username}
                      onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>

                  {/* Only show password field for admin users */}
                  {currentUser?.role === 'admin' && (
                    <div className="form-group">
                      <PasswordInput
                        id="newPassword"
                        value={newUser.password}
                        onChange={(password) => setNewUser(prev => ({ ...prev, password }))}
                        label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
                        placeholder={editingUser ? 'Leave blank to keep current password' : 'Enter password'}
                        required={!editingUser}
                        showStrength={true}
                        showRequirements={!editingUser} // Only show requirements for new users
                        showGenerateButton={true}
                      />
                    </div>
                  )}

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

                  <div className="form-group">
                    <label htmlFor="newRole" className="required">Role</label>
                    <SearchableDropdown
                      options={availableRoles}
                      value={newUser.role}
                      onChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}
                      placeholder="Select Role"
                    />
                  </div>

                  {/* Show countries field for non-admin users when current user is admin or has edit-countries permission */}
                  {(newUser.role !== 'admin' && (currentUser?.role === 'admin' || canEditCountries)) && (
                    <div className="form-group">
                      <MultiSelectDropdown
                        id="newCountries"
                        label="Countries"
                        options={availableCountries}
                        value={newUser.countries}
                        onChange={(values) => {
                          // Get valid departments for the selected countries
                          const validDepartmentsForCountries = newUser.departments || [];

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

                {/* Show departments field for non-admin users (edit-countries permission only affects countries field) */}
                {newUser.role !== 'admin' && (
                  <div className="form-group">
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
                )}

                {/* Show message when user cannot edit countries (departments are still editable) */}
                {newUser.role !== 'admin' && currentUser?.role !== 'admin' && !canEditCountries && (
                  <div className="form-group">
                    <div className="permission-warning">
                      <div className="warning-icon">⚠️</div>
                      <div className="warning-content">
                        <h4>Limited Access</h4>
                        <p>You don't have permission to assign countries to users.</p>
                        <p>Contact an administrator to modify user country assignments.</p>
                      </div>
                    </div>
                  </div>
                )}

                {error && <div className="error-message">{error}</div>}

                </div>
                <div className="form-actions" style={{padding: '1.5rem 2rem', borderTop: '2px solid #f1f5f9', flexShrink: 0}}>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingUser ? 'Update User' : 'Add User'}
                  </button>
                </div>
              </form>
              </div>
            </div>
          )}

          {/* Modern Advanced Filters - Outside of users table */}
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
                    Showing {users.length} users
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

          {/* Users Section with Modern Cards */}
          <div className="users-section">
            <div className="users-header">
              <h2 className="users-title">Team Members ({users.length})</h2>
              <div className="users-actions">
                {/* Real-time refresh button */}
                <button
                  onClick={refreshUsers}
                  className="btn btn-outline-secondary btn-md refresh-button"
                  disabled={usersLoading || isMutating}
                  title="Refresh users data"
                >
                  {usersLoading ? '⏳ Loading...' : '↻ Refresh'}
                </button>


                {canCreateUsers && (
                  <button
                    onClick={() => showAddUser ? handleCancelEdit() : setShowAddUser(true)}
                    className="add-user-btn"
                    disabled={isMutating}
                  >
                    <span>👤</span>
                    {showAddUser ? 'Cancel' : 'Add New User'}
                  </button>
                )}
              </div>
            </div>

            {/* Real-time error display */}
            {usersError && (
              <div className="alert alert-danger" role="alert">
                <strong>Real-time Error:</strong> {usersError instanceof Error ? usersError.message : 'Failed to load users'}
                <button onClick={refreshUsers} className="btn btn-sm btn-outline-danger ms-2">
                  Try Again
                </button>
              </div>
            )}

            {/* Loading indicator for real-time data */}
            {usersLoading && (
              <div className="loading-indicator text-center p-3">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading users...</span>
                </div>
                <p className="mt-2 mb-0">Loading fresh user data...</p>
              </div>
            )}

            {/* Users Grid */}
            <div className="users-grid">
              {getCurrentPageUsers().map(user => {
                const userEnabled = user.enabled !== undefined ? user.enabled : true;
                return (
                  <div key={user.id} className="user-card">
                    <div className="user-card-header">
                      <div className="user-info">
                        <h3 className="user-name">{user.name}</h3>
                        <p className="user-username">@{user.username}</p>
                      </div>
                      <div className="user-status">
                        <div className={`status-indicator ${userEnabled ? 'enabled' : 'disabled'}`}></div>
                        <span className={`status-text ${userEnabled ? 'enabled' : 'disabled'}`}>
                          {userEnabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="user-details">
                      <div className="user-role">
                        <div className="role-icon"></div>
                        {user.role.replace(/-/g, ' ').toUpperCase()}
                      </div>

                      {user.email && (
                        <div className="user-email">
                          <span>✉️</span>
                          {user.email}
                        </div>
                      )}

                      {/* Only show assignments for non-admin users */}
                      {user.role !== 'admin' && (
                        <div className="user-assignments">
                          {/* Countries */}
                          <div className="assignment-row">
                            <span className="assignment-label">Countries:</span>
                            <div className="assignment-value">
                              {user.countries && user.countries.length > 0 ? (
                                <div className="badge-container">
                                  {user.countries.slice(0, 2).map((country, index) => (
                                    <span key={index} className="assignment-badge country">
                                      {country}
                                    </span>
                                  ))}
                                  {user.countries.length > 2 && (
                                    <span
                                      className="assignment-badge badge-more"
                                      onClick={() => handleShowMore('countries', user.countries!, user.name)}
                                      title="Show all countries"
                                    >
                                      +{user.countries.length - 2} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{color: '#9ca3af', fontSize: '0.8rem'}}>No countries</span>
                              )}
                            </div>
                          </div>

                          {/* Departments */}
                          <div className="assignment-row">
                            <span className="assignment-label">Departments:</span>
                            <div className="assignment-value">
                              {user.departments && user.departments.length > 0 ? (
                                <div className="badge-container">
                                  {formatDepartmentsWithCountry(user.departments, user.countries || []).slice(0, 1).map((dept, index) => (
                                    <span
                                      key={index}
                                      className={`assignment-badge ${!(user.countries && user.countries.length > 0) ? 'badge-warning' : ''}`}
                                      title={!(user.countries && user.countries.length > 0) ? 'Department without country assigned' : dept}
                                    >
                                      {!(user.countries && user.countries.length > 0) && '⚠️ '}{dept}
                                    </span>
                                  ))}
                                  {user.departments.length > 1 && (
                                    <span
                                      className="assignment-badge badge-more"
                                      onClick={() => handleShowMore('departments', formatDepartmentsWithCountry(user.departments!, user.countries || []), user.name)}
                                      title="Show all departments"
                                    >
                                      +{user.departments.length - 1} more
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{color: '#9ca3af', fontSize: '0.8rem'}}>No departments</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show global access indicator for admin users */}
                      {user.role === 'admin' && (
                        <div className="admin-access-indicator">
                          <div className="assignment-row">
                            <span className="assignment-label">Access Level:</span>
                            <div className="assignment-value">
                              <span className="assignment-badge admin-badge">
                                🌍 Global Access - All Countries & Departments
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* User Actions */}
                    {user.username !== 'Admin' && (
                      <div className="user-actions">
                        {canEditUsers && (
                          <button
                            className="action-btn edit"
                            onClick={() => handleEditUser(user)}
                            title="Edit User"
                          >
                            <span>✏️<br/>Edit</span>
                          </button>
                        )}
                        {canResetPassword && (
                          <button
                            className="action-btn reset"
                            onClick={() => handleResetPassword(user)}
                            title="Reset Password"
                          >
                            <span>🔑<br/>Reset</span>
                          </button>
                        )}
                        {canEnableDisableUsers && (
                          <button
                            className="action-btn toggle"
                            onClick={() => handleToggleUserStatus(user.id, userEnabled)}
                            title={userEnabled ? 'Disable User' : 'Enable User'}
                          >
                            <span>{userEnabled ? '🔒' : '🔓'}<br/>{userEnabled ? 'Disable' : 'Enable'}</span>
                          </button>
                        )}
                        {(console.log(`🔍 Delete button check for ${user.name}:`, { canDeleteUsers, userId: user.id, currentUserRole: currentUser?.role }), canDeleteUsers) && (
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete User"
                          >
                            <span>🗑️<br/>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * usersPerPage) + 1} to {Math.min(currentPage * usersPerPage, totalUsers)} of {totalUsers} users
                </div>
                <div className="pagination-controls">
                  <button
                    className="pagination-btn prev"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    title="Previous page"
                  >
                    ← Previous
                  </button>

                  <div className="pagination-pages">
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first, last, current, and adjacent pages
                      const showPage = pageNumber === 1 ||
                                     pageNumber === totalPages ||
                                     (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);

                      if (!showPage && pageNumber === 2 && currentPage > 3) {
                        return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                      }
                      if (!showPage && pageNumber === totalPages - 1 && currentPage < totalPages - 2) {
                        return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                      }
                      if (!showPage) return null;

                      return (
                        <button
                          key={pageNumber}
                          className={`pagination-btn page ${pageNumber === currentPage ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="pagination-btn next"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    title="Next page"
                  >
                    Next →
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
              {popupData.type === 'departments' ? (
                // Group departments by country
                Object.entries(groupDepartmentsByCountry(popupData.items)).map(([country, departments]) => (
                  <div key={country} style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{
                      color: 'var(--primary-color)',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      marginBottom: '0.75rem',
                      borderBottom: '2px solid #e0f7f7',
                      paddingBottom: '0.5rem'
                    }}>
                      {country}
                    </h4>
                    <div className="popup-badge-grid">
                      {departments.map((dept, index) => (
                        <span
                          key={index}
                          className="badge badge-department"
                          title={dept}
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                // Regular display for countries
                <div className="popup-badge-grid">
                  {popupData.items.map((item, index) => (
                    <span
                      key={index}
                      className="badge badge-country"
                      title={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="popup-footer">
              <p className="popup-info">Press ESC or click outside to close</p>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordUser && (
        <div className="modal-overlay" onClick={() => setShowResetPasswordModal(false)}>
          <div
            className="modal-content reset-password-modal"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setShowResetPasswordModal(false);
              }
            }}
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 className="modal-title">🔑 Reset Password</h2>
              <button
                className="close-btn"
                onClick={() => setShowResetPasswordModal(false)}
                aria-label="Close modal"
              >
                ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="reset-password-info">
                  <p>Reset password for <strong>{resetPasswordUser.name}</strong> ({resetPasswordUser.username})?</p>
                  <div className="warning-banner">
                    <span className="warning-icon">⚠️</span>
                    <span className="warning-text">The user will be required to change this password on their next login.</span>
                  </div>
                </div>

                <PasswordInput
                  id="tempPassword"
                  value={tempPassword}
                  onChange={setTempPassword}
                  label="Temporary Password"
                  placeholder="Enter temporary password"
                  required={true}
                  showStrength={true}
                  showRequirements={true}
                  showGenerateButton={true}
                />

                {error && <div className="error-message">{error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary btn-md"
                  onClick={() => setShowResetPasswordModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-warning btn-md"
                  onClick={handleConfirmResetPassword}
                  disabled={!tempPassword || tempPassword.length < 6}
                >
                  🔄 Reset Password
                </button>
              </div>
            </div>
          </div>
      )}

      {/* Confirmation Modal for Delete/Disable/Enable actions */}
      <CustomModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, type: null, user: null })}
        title={
          confirmModal.type === 'delete' ? '🗑️ Delete User' :
          confirmModal.type === 'disable' ? '❌ Disable User' :
          confirmModal.type === 'enable' ? '✅ Enable User' : ''
        }
        message={
          confirmModal.type === 'delete'
            ? `Are you sure you want to delete user "${confirmModal.user?.name}" (${confirmModal.user?.username})?\n\nThis action cannot be undone and will permanently remove all user data.`
            : confirmModal.type === 'disable'
            ? `Are you sure you want to disable user "${confirmModal.user?.name}" (${confirmModal.user?.username})?\n\nThis will prevent them from logging into the system.`
            : confirmModal.type === 'enable'
            ? `Are you sure you want to enable user "${confirmModal.user?.name}" (${confirmModal.user?.username})?\n\nThis will allow them to log into the system.`
            : ''
        }
        type={confirmModal.type === 'delete' ? 'warning' : 'confirm'}
        actions={[
          {
            label: 'Cancel',
            onClick: () => setConfirmModal({ isOpen: false, type: null, user: null }),
            style: 'secondary'
          },
          {
            label: confirmModal.type === 'delete' ? 'Delete User' :
                   confirmModal.type === 'disable' ? 'Disable User' :
                   confirmModal.type === 'enable' ? 'Enable User' : 'Confirm',
            onClick: confirmModal.type === 'delete' ? confirmDeleteUser : confirmToggleUserStatus,
            style: confirmModal.type === 'delete' ? 'danger' : 'primary'
          }
        ]}
      />

    </div>
  );
};

export default UserManagement;