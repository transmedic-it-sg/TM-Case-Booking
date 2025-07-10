import { useState, useEffect } from 'react';
import { getUserNamesByIds } from '../utils/userLookup';

/**
 * Hook to resolve user IDs to names for display
 */
export const useUserNames = (userIds: string[]) => {
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserNames = async () => {
      if (userIds.length === 0) {
        setLoading(false);
        return;
      }
      
      try {
        const names = await getUserNamesByIds(userIds);
        
        // Debug logging for specific problematic UUIDs
        const problematicIds = userIds.filter(id => names[id] === id && id.includes('-'));
        if (problematicIds.length > 0) {
          console.log('User lookup failed for IDs:', problematicIds);
          console.log('All user names resolved:', names);
        }
        
        setUserNames(names);
      } catch (error) {
        console.error('Error loading user names:', error);
        // Fallback to userIds as names
        const fallback: Record<string, string> = {};
        userIds.forEach(id => {
          fallback[id] = id;
        });
        setUserNames(fallback);
      } finally {
        setLoading(false);
      }
    };

    loadUserNames();
  }, [userIds]);

  const getUserName = (userId: string): string => {
    return userNames[userId] || userId;
  };

  return { getUserName, userNames, loading };
};

/**
 * Hook to resolve a single user ID to name
 */
export const useUserName = (userId: string) => {
  const { getUserName, loading } = useUserNames([userId]);
  return { userName: getUserName(userId), loading };
};