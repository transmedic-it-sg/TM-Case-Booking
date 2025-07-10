import { User, COUNTRIES } from '../types';
import { getCountries } from './codeTable';
import { 
  getSupabaseUsers, 
  addSupabaseUser, 
  authenticateUser, 
  createSession, 
  deleteSession,
  getCurrentUserFromStorage,
  saveCurrentUserToStorage,
  clearCurrentUserFromStorage,
  checkUsersExist,
  migrateUsersFromLocalStorage
} from './supabaseAuthService';

const STORAGE_KEY = 'case-booking-users';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Check if users exist in Supabase
    const usersExist = await checkUsersExist();
    
    if (usersExist) {
      // Get users from Supabase
      return await getSupabaseUsers();
    } else {
      // If no users in Supabase, check localStorage and migrate
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        console.log('Migrating users from localStorage to Supabase...');
        await migrateUsersFromLocalStorage();
        return await getSupabaseUsers();
      }
      
      // Create default admin user if none exist
      const defaultUser: Omit<User, 'id'> = {
        username: 'Admin',
        password: 'Admin',
        role: 'admin',
        name: 'Administrator',
        departments: [],
        countries: getCountries().length > 0 ? getCountries() : [...COUNTRIES],
        enabled: true
      };
      
      const createdUser = await addSupabaseUser(defaultUser);
      return [createdUser];
    }
  } catch (error) {
    console.error('Error getting users, falling back to localStorage:', error);
    // Fallback to localStorage
    return getUsersFromLocalStorage();
  }
};

// Backup function to get users from localStorage
const getUsersFromLocalStorage = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const users = JSON.parse(stored);
    return users.map((user: any) => ({
      ...user,
      countries: user.countries || [],
      departments: user.departments || (user.department ? [user.department] : [])
    }));
  }
  
  const defaultUsers: User[] = [
    {
      id: '1',
      username: 'Admin',
      password: 'Admin',
      role: 'admin',
      name: 'Administrator',
      departments: [],
      countries: getCountries().length > 0 ? getCountries() : [...COUNTRIES]
    }
  ];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
};

export const addUser = async (user: Omit<User, 'id'>): Promise<User> => {
  try {
    return await addSupabaseUser(user);
  } catch (error) {
    console.error('Error adding user to Supabase, falling back to localStorage:', error);
    // Fallback to localStorage
    const users = getUsersFromLocalStorage();
    const newUser: User = {
      ...user,
      id: Date.now().toString()
    };
    
    users.push(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    return newUser;
  }
};

export const authenticate = async (username: string, password: string, country: string): Promise<{ user: User | null; error?: string }> => {
  try {
    const user = await authenticateUser(username, password);
    
    if (!user) {
      return { user: null, error: "Invalid username or password" };
    }
    
    // Check if user account is enabled
    if (!user.enabled) {
      return { user: null, error: "Your account has been disabled. Please contact your administrator." };
    }
    
    // Check if user has access to the selected country
    if (user.role === 'admin' || (user.countries && user.countries.includes(country))) {
      const userWithCountry = { ...user, selectedCountry: country };
      
      // Create session in Supabase
      await createSession(user.id);
      
      // Save to localStorage for backward compatibility
      saveCurrentUserToStorage(userWithCountry);
      
      return { user: userWithCountry };
    } else {
      return { user: null, error: "Your account is not assigned to the selected country" };
    }
  } catch (error) {
    console.error('Error authenticating user:', error);
    return { user: null, error: "Authentication failed. Please try again." };
  }
};

export const getCurrentUser = (): User | null => {
  return getCurrentUserFromStorage();
};

export const logout = async (): Promise<void> => {
  try {
    // Get current session token if exists
    const sessionToken = localStorage.getItem('session-token');
    if (sessionToken) {
      await deleteSession(sessionToken);
      localStorage.removeItem('session-token');
    }
    
    // Clear localStorage session
    clearCurrentUserFromStorage();
  } catch (error) {
    console.error('Error during logout:', error);
    // Still clear localStorage even if Supabase logout fails
    clearCurrentUserFromStorage();
  }
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

/**
 * Get user email by username/name
 * @param identifier - Username or full name of the user
 * @returns User email if found, null otherwise
 */
export const getUserEmail = async (identifier: string): Promise<string | null> => {
  try {
    const users = await getUsers();
    const user = users.find(u => 
      u.username.toLowerCase() === identifier.toLowerCase() || 
      u.name.toLowerCase() === identifier.toLowerCase()
    );
    return user?.email || null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

// Synchronous version for backward compatibility
export const getUserEmailSync = (identifier: string): string | null => {
  const users = getUsersFromLocalStorage();
  const user = users.find(u => 
    u.username.toLowerCase() === identifier.toLowerCase() || 
    u.name.toLowerCase() === identifier.toLowerCase()
  );
  return user?.email || null;
};