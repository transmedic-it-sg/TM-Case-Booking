import { User } from '../types';
import { getUsers } from './auth';

// Cache for user data to avoid repeated API calls
let usersCache: User[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get all users with caching
 */
export const getCachedUsers = async (): Promise<User[]> => {
  const now = Date.now();
  
  if (usersCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return usersCache;
  }
  
  try {
    usersCache = await getUsers();
    cacheTimestamp = now;
    return usersCache;
  } catch (error) {
    console.error('Error loading users for lookup:', error);
    return usersCache || [];
  }
};

/**
 * Convert user ID to user name
 */
export const getUserNameById = async (userId: string): Promise<string> => {
  if (!userId) return 'Unknown User';
  
  const users = await getCachedUsers();
  const user = users.find(u => u.id === userId);
  return user ? user.name : userId; // Fallback to ID if user not found
};

/**
 * Convert multiple user IDs to names
 */
export const getUserNamesByIds = async (userIds: string[]): Promise<Record<string, string>> => {
  const users = await getCachedUsers();
  const result: Record<string, string> = {};
  
  userIds.forEach(userId => {
    const user = users.find(u => u.id === userId);
    result[userId] = user ? user.name : userId;
  });
  
  return result;
};

/**
 * Hook for components to use user lookup
 */
export const useUserLookup = () => {
  return {
    getUserNameById,
    getUserNamesByIds,
    getCachedUsers
  };
};