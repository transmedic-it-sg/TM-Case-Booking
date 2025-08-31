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
    console.log('📋 Using cached users (', usersCache.length, 'users )');
    return usersCache;
  }
  
  console.log('🔄 Loading users from auth service...');
  try {
    usersCache = await getUsers();
    cacheTimestamp = now;
    console.log('✅ Users loaded successfully:', usersCache.length, 'users');
    console.log('👥 User IDs and names:', usersCache.map(u => ({ id: u.id, name: u.name })));
    return usersCache;
  } catch (error) {
    console.error('❌ Error loading users for lookup:', error);
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
  console.log('🔍 getUserNamesByIds called with:', userIds);
  
  // First try the cached users approach
  const users = await getCachedUsers();
  console.log('👥 Cached users loaded:', users.length, 'users');
  
  const result: Record<string, string> = {};
  
  userIds.forEach(userId => {
    const user = users.find(u => u.id === userId);
    result[userId] = user ? user.name : userId;
    
    if (!user && userId.includes('-')) {
      console.log(`⚠️ User not found in cache: ${userId}`);
    }
  });
  
  // For any UUIDs that weren't found, try direct Supabase lookup
  const missingIds = userIds.filter(id => result[id] === id && id.includes('-'));
  if (missingIds.length > 0) {
    console.log('🔍 Attempting direct Supabase lookup for missing UUIDs:', missingIds);
    
    try {
      // Try profiles table first
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', missingIds);
      
      if (profilesError) {
        console.error('❌ Profiles lookup error:', profilesError);
      } else {
        console.log('📋 Direct Supabase profiles lookup results:', profiles);
        if (profiles) {
          profiles.forEach(profile => {
            result[profile.id] = profile.name;
            console.log(`✅ Mapped from profiles: ${profile.id} → ${profile.name}`);
          });
        }
      }
      
      // Users table removed - all users are now in profiles table only
    } catch (error) {
      console.error('💥 Error in direct Supabase user lookup:', error);
    }
  }
  
  // Final fallback: Create user-friendly names for any remaining UUIDs
  Object.keys(result).forEach(userId => {
    if (result[userId] === userId && userId.includes('-')) {
      // Create a short readable identifier from UUID
      const shortId = userId.substring(0, 8);
      result[userId] = `User ${shortId}`;
      console.log(`🔄 Created fallback name for ${userId} → ${result[userId]}`);
    }
  });
  
  console.log('📤 Final user name mappings:', result);
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