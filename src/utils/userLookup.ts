import { User } from '../types';
import { getUsers } from './auth';
import { supabase } from '../lib/supabase';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

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
  
  const result: Record<string, string> = {};
  
  try {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'Current_user': 'Current User',
      'current_user': 'Current User', 
      'system': 'System',
      'System': 'System'
    };

    // Separate special cases from UUIDs, emails, and usernames
    const uuids = userIds.filter(id => id && id.includes('-') && !id.includes('@'));
    const emails = userIds.filter(id => id && id.includes('@'));
    const usernames = userIds.filter(id => id && !id.includes('-') && !id.includes('@'));

    // Handle email lookups
    if (emails.length > 0) {
      const { data: profilesByEmail } = await supabase
        .from('profiles')
        .select('email, name')
        .in('email', emails);
      
      if (profilesByEmail) {
        profilesByEmail.forEach(profile => {
          result[profile.email] = profile.name;
        });
      }
    }

    // Handle username lookups
    if (usernames.length > 0) {
      const { data: profilesByUsername } = await supabase
        .from('profiles')
        .select('username, name')
        .in('username', usernames);
      
      if (profilesByUsername) {
        profilesByUsername.forEach(profile => {
          result[profile.username] = profile.name;
        });
      }
    }

    // Get all user names directly from profiles table for UUIDs
    if (uuids.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', uuids);

      if (!profilesError && profiles) {
        profiles.forEach(profile => {
          result[profile.id] = profile.name;
        });
      }
    }
    
    // Apply special case replacements and fallbacks
    userIds.forEach(userId => {
      if (!(userId in result)) {
        // Check if it's a special case
        if (specialCases[userId]) {
          result[userId] = specialCases[userId];
        } else {
          // Try to get from current user session if it matches
          const currentUserStr = sessionStorage.getItem('currentUser');
          if (currentUserStr) {
            try {
              const currentUser = JSON.parse(currentUserStr);
              if (currentUser && (userId === currentUser.id || userId === currentUser.username)) {
                result[userId] = currentUser.name || userId;
              } else {
                result[userId] = userId;
              }
            } catch {
              result[userId] = userId;
            }
          } else {
            // Final fallback to the userId itself
            result[userId] = userId;
          }
        }
      }
    });
  } catch (error) {
    // Fallback to userIds as names
    userIds.forEach(userId => {
      result[userId] = userId;
    });
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