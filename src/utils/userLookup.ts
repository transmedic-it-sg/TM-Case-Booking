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
    // console.error('❌ Error loading users for lookup:', error);
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
  // console.log('🔍 getUserNamesByIds called with userIds:', userIds);
  
  const result: Record<string, string> = {};
  
  try {
    // Get all user names directly from profiles table
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, name')
      .in('id', userIds.filter(id => id && id.includes('-')));

    // console.log('📄 Supabase profiles response:', { profiles, error: profilesError });

    if (profilesError) {
      // console.error('❌ Direct profiles lookup error:', profilesError);
      // Fallback to userIds as names
      userIds.forEach(userId => {
        result[userId] = userId;
      });
    } else {
      // First, set all IDs to themselves as fallback
      userIds.forEach(userId => {
        result[userId] = userId;
      });
      
      // Then update with actual names where found
      if (profiles) {
        profiles.forEach(profile => {
          result[profile.id] = profile.name;
          // console.log(`✅ Mapped user: ${profile.id} -> ${profile.name}`);
        });
      }
    }
  } catch (error) {
    // console.error('💥 Error in direct Supabase user lookup:', error);
    // Fallback to userIds as names
    userIds.forEach(userId => {
      result[userId] = userId;
    });
  }
  
  // console.log('🎉 Final getUserNamesByIds result:', result);
  
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