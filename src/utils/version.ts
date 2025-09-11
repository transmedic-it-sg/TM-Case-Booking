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
 * Get the current cache version from package.json
 */
export const getCacheVersion = (): string => {
  return (packageJson as any).cacheVersion || '1.0.0';
};

/**
 * Get app name from package.json
 */
export const getAppName = (): string => {
  return packageJson.name;
};