import { User, COUNTRIES } from '../types';

const STORAGE_KEY = 'case-booking-users';
const SESSION_KEY = 'case-booking-session';

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const users = JSON.parse(stored);
    // Ensure all users have countries and departments arrays (migration safety)
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
      countries: [...COUNTRIES]
    }
  ];
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultUsers));
  return defaultUsers;
};

export const addUser = (user: Omit<User, 'id'>): User => {
  const users = getUsers();
  const newUser: User = {
    ...user,
    id: Date.now().toString()
  };
  
  users.push(newUser);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  return newUser;
};

export const authenticate = (username: string, password: string, country: string): { user: User | null; error?: string } => {
  const users = getUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
  
  if (!user) {
    return { user: null, error: "Invalid username or password" };
  }
  
  // Check if user has access to the selected country
  if (user.role === 'admin' || (user.countries && user.countries.includes(country))) {
    const userWithCountry = { ...user, selectedCountry: country };
    localStorage.setItem(SESSION_KEY, JSON.stringify(userWithCountry));
    return { user: userWithCountry };
  } else {
    return { user: null, error: "Your account is not assigned to the selected country" };
  }
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
};

export const logout = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};