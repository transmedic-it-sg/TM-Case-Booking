import { User } from '../../types';

export interface UserFormData {
  username: string;
  password: string;
  name: string;
  role: string; // Support for dynamic roles including custom ones
  departments: string[];
  countries: string[];
}

export interface UserManagementState {
  users: User[];
  showAddUser: boolean;
  editingUser: string | null;
  showPasswordFor: string | null;
  newUser: UserFormData;
  error: string;
  showRoleDescriptions: boolean;
  currentPage: number;
  usersPerPage: number;
}