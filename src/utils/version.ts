/**
 * Version utility to get app version from package.json
 */

// Import package.json to get the version
import packageJson from '../../package.json';

/**
 * Get the current application version from package.json
 */
export const getAppVersion = (): string => {
  return packageJson.version;
};


/**
 * Get app name from package.json
 */
export const getAppName = (): string => {
  return packageJson.name;
};

/**
 * Detect the current environment based on URL and NODE_ENV
 */
export const getEnvironment = (): 'Development' | 'Production' => {
  // Check if running on Vercel (production)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname.includes('.app') || 
        (hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('192.168'))) {
      return 'Production';
    }
  }
  
  // Check NODE_ENV if available
  if (process.env.NODE_ENV === 'production') {
    return 'Production';
  }
  
  // Default to Development for localhost and unknown environments
  return 'Development';
};

/**
 * Get build information including environment
 */
export const getBuildInfo = () => {
  return {
    version: getAppVersion(),
    environment: getEnvironment(),
    buildDate: new Date().toISOString().split('T')[0], // Current date as fallback
    lastUpdate: 'October 2025' // As requested by user
  };
};