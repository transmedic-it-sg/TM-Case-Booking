import { User } from '../types';
import { getUsers } from './auth';
import { supabase } from '../lib/supabase';

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
  // First try the cached users approach
  const users = await getCachedUsers();
  const result: Record<string, string> = {};
  
  userIds.forEach(userId => {
    const user = users.find(u => u.id === userId);
    result[userId] = user ? user.name : userId;
  });
  
  // For any UUIDs that weren't found, try direct Supabase lookup
  const missingIds = userIds.filter(id => result[id] === id && id.includes('-'));
  if (missingIds.length > 0) {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', missingIds);
      
      if (!error && profiles) {
        profiles.forEach(profile => {
          result[profile.id] = profile.name;
        });
      }
    } catch (error) {
      console.error('Error in direct Supabase user lookup:', error);
    }
  }
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