// Database-driven constants service to replace hardcoded values
import { lookupOperations } from './supabaseServiceFixed'

// =============================================================================
// CACHE MANAGEMENT - Enhanced with corruption prevention
// =============================================================================

interface ConstantsCacheEntry<T> {
  data: T
  timestamp: number
  version: number
  country?: string
  isPending?: boolean
}

interface ConstantsCache {
  countries: ConstantsCacheEntry<any[]> | null
  caseStatuses: ConstantsCacheEntry<any[]> | null
  departments: Map<string, ConstantsCacheEntry<any[]>>
  hospitals: Map<string, ConstantsCacheEntry<any[]>>
  procedureTypes: Map<string, ConstantsCacheEntry<any[]>>
  surgerySets: Map<string, ConstantsCacheEntry<any[]>>
  implantBoxes: Map<string, ConstantsCacheEntry<any[]>>
  pendingRequests: Map<string, Promise<any>>
}

const cache: ConstantsCache = {
  countries: null,
  caseStatuses: null,
  departments: new Map(),
  hospitals: new Map(),
  procedureTypes: new Map(),
  surgerySets: new Map(),
  implantBoxes: new Map(),
  pendingRequests: new Map()
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CACHE_VERSION = 1 // Increment when cache structure changes

// Prevent cache corruption with atomic operations
const isCacheValid = <T>(cacheEntry: ConstantsCacheEntry<T> | null): boolean => {
  if (!cacheEntry) return false
  if (cacheEntry.version !== CACHE_VERSION) return false
  if (cacheEntry.isPending) return false
  return Date.now() - cacheEntry.timestamp < CACHE_DURATION
}

const createCacheEntry = <T>(data: T, country?: string): ConstantsCacheEntry<T> => {
  return {
    data,
    timestamp: Date.now(),
    version: CACHE_VERSION,
    country,
    isPending: false
  }
}

// Atomic cache operations to prevent corruption
const setCacheEntry = <T>(key: string, data: T, isGlobal = false): void => {
  const entry = createCacheEntry(data, isGlobal ? 'Global' : undefined)
  
  if (key === 'countries') {
    cache.countries = entry as ConstantsCacheEntry<any[]>
  } else if (key === 'caseStatuses') {
    cache.caseStatuses = entry as ConstantsCacheEntry<any[]>
  } else if (key.startsWith('departments_')) {
    const country = key.replace('departments_', '')
    cache.departments.set(country, entry as ConstantsCacheEntry<any[]>)
  } else if (key.startsWith('hospitals_')) {
    const country = key.replace('hospitals_', '')
    cache.hospitals.set(country, entry as ConstantsCacheEntry<any[]>)
  } else if (key.startsWith('procedureTypes_')) {
    const country = key.replace('procedureTypes_', '')
    cache.procedureTypes.set(country, entry as ConstantsCacheEntry<any[]>)
  } else if (key.startsWith('surgerySets_')) {
    const country = key.replace('surgerySets_', '')
    cache.surgerySets.set(country, entry as ConstantsCacheEntry<any[]>)
  } else if (key.startsWith('implantBoxes_')) {
    const country = key.replace('implantBoxes_', '')
    cache.implantBoxes.set(country, entry as ConstantsCacheEntry<any[]>)
  }
}

const getCacheEntry = <T>(key: string): ConstantsCacheEntry<T> | null => {
  if (key === 'countries') {
    return cache.countries as ConstantsCacheEntry<T> | null
  } else if (key === 'caseStatuses') {
    return cache.caseStatuses as ConstantsCacheEntry<T> | null
  } else if (key.startsWith('departments_')) {
    const country = key.replace('departments_', '')
    return cache.departments.get(country) as ConstantsCacheEntry<T> | null
  } else if (key.startsWith('hospitals_')) {
    const country = key.replace('hospitals_', '')
    return cache.hospitals.get(country) as ConstantsCacheEntry<T> | null
  } else if (key.startsWith('procedureTypes_')) {
    const country = key.replace('procedureTypes_', '')
    return cache.procedureTypes.get(country) as ConstantsCacheEntry<T> | null
  } else if (key.startsWith('surgerySets_')) {
    const country = key.replace('surgerySets_', '')
    return cache.surgerySets.get(country) as ConstantsCacheEntry<T> | null
  } else if (key.startsWith('implantBoxes_')) {
    const country = key.replace('implantBoxes_', '')
    return cache.implantBoxes.get(country) as ConstantsCacheEntry<T> | null
  }
  return null
}

// Generic helper to prevent duplicate requests and cache corruption
const getCachedOrFetch = async <T>(
  cacheKey: string,
  fetchFn: () => Promise<{ success: boolean; data?: T; error?: string }>,
  mapFn?: (data: T) => any[],
  isGlobal = false
): Promise<any[]> => {
  const cachedEntry = getCacheEntry<T>(cacheKey)
  
  // Return valid cache data
  if (isCacheValid(cachedEntry)) {
    return mapFn ? mapFn(cachedEntry!.data) : cachedEntry!.data as any[]
  }

  // Check for pending request to prevent duplicate requests
  const pendingRequest = cache.pendingRequests.get(cacheKey)
  if (pendingRequest) {
    try {
      return await pendingRequest
    } catch (error) {
      console.error(`Error waiting for pending ${cacheKey} request:`, error)
      return []
    }
  }

  // Create new request and cache it
  const fetchPromise = (async (): Promise<any[]> => {
    try {
      const result = await fetchFn()
      if (result.success && result.data) {
        setCacheEntry(cacheKey, result.data, isGlobal)
        return mapFn ? mapFn(result.data) : result.data as any[]
      } else {
        console.error(`Error fetching ${cacheKey}:`, result.error)
        return []
      }
    } catch (error) {
      console.error(`Error fetching ${cacheKey}:`, error)
      return []
    } finally {
      // Clean up pending request
      cache.pendingRequests.delete(cacheKey)
    }
  })()

  cache.pendingRequests.set(cacheKey, fetchPromise)
  return fetchPromise
}

// =============================================================================
// COUNTRIES
// =============================================================================

export const getCountries = async (): Promise<string[]> => {
  return getCachedOrFetch(
    'countries',
    async () => {
      const result = await lookupOperations.getCountries();
      return result; // Return the CaseOperationsResult as-is
    },
    (data: any[]) => data.map(c => c.name),
    true // Countries are Global
  )
}

export const getCountryByCode = async (code: string): Promise<string | null> => {
  const cachedEntry = getCacheEntry<any[]>('countries')
  let countries: any[] = []
  
  if (isCacheValid(cachedEntry)) {
    countries = cachedEntry!.data
  } else {
    const result = await lookupOperations.getCountries()
    countries = result.success && result.data ? result.data : []
  }
  
  const country = countries.find((c: any) => c.code === code)
  return country?.name || null
}

// =============================================================================
// CASE STATUSES (Database-driven)
// =============================================================================

export const getCaseStatuses = async (): Promise<any[]> => {
  return getCachedOrFetch(
    'caseStatuses',
    () => lookupOperations.getCaseStatuses(),
    undefined, // No mapping needed - return data as-is
    true // Case statuses are Global
  )
}

export const getStatusColor = async (statusKey: string): Promise<string> => {
  const statuses = await getCaseStatuses()
  const status = statuses.find(s => s.status_key === statusKey)
  return status?.color || '#6c757d'
}

export const getStatusIcon = async (statusKey: string): Promise<string> => {
  const statuses = await getCaseStatuses()
  const status = statuses.find(s => s.status_key === statusKey)
  return status?.icon || '📄'
}

export const getStatusLabel = async (statusKey: string): Promise<string> => {
  const statuses = await getCaseStatuses()
  const status = statuses.find(s => s.status_key === statusKey)
  return status?.display_name || statusKey
}

export const getStatusWorkflow = async (): Promise<string[]> => {
  const statuses = await getCaseStatuses()
  return statuses
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(s => s.status_key)
}

// =============================================================================
// DEPARTMENTS (Country-specific)
// =============================================================================

export const getDepartments = async (country?: string): Promise<string[]> => {
  const cacheKey = `departments_${country || 'global'}`
  return getCachedOrFetch(
    cacheKey,
    () => lookupOperations.getDepartments(country),
    (data: any[]) => data.map(d => d.name),
    false // Departments are country-specific
  )
}

// =============================================================================
// HOSPITALS (Country-specific)
// =============================================================================

export const getHospitals = async (country?: string): Promise<string[]> => {
  const cacheKey = `hospitals_${country || 'global'}`
  return getCachedOrFetch(
    cacheKey,
    () => lookupOperations.getHospitals(country),
    (data: any[]) => data.map(h => h.name),
    false // Hospitals are country-specific
  )
}

// =============================================================================
// PROCEDURE TYPES (Country-specific)
// =============================================================================

export const getProcedureTypes = async (country?: string): Promise<string[]> => {
  const cacheKey = `procedureTypes_${country || 'global'}`
  return getCachedOrFetch(
    cacheKey,
    () => lookupOperations.getProcedureTypes(country),
    (data: any[]) => data.map(p => p.name),
    false // Procedure types have country-specific + Global fallback
  )
}

// =============================================================================
// SURGERY SETS (Country-specific)
// =============================================================================

export const getSurgerySets = async (country?: string): Promise<string[]> => {
  const cacheKey = `surgerySets_${country || 'global'}`
  return getCachedOrFetch(
    cacheKey,
    () => lookupOperations.getSurgerySets(country),
    (data: any[]) => data.map(s => s.name),
    false // Surgery sets have country-specific + Global fallback
  )
}

// =============================================================================
// IMPLANT BOXES (Country-specific)
// =============================================================================

export const getImplantBoxes = async (country?: string): Promise<string[]> => {
  const cacheKey = `implantBoxes_${country || 'global'}`
  return getCachedOrFetch(
    cacheKey,
    () => lookupOperations.getImplantBoxes(country),
    (data: any[]) => data.map(b => b.name),
    false // Implant boxes have country-specific + Global fallback
  )
}

// =============================================================================
// PROCEDURE MAPPINGS
// =============================================================================

export const getProcedureMappings = async (procedureType: string, country?: string) => {
  try {
    const result = await lookupOperations.getProcedureMappings(procedureType, country)
    if (result.success && result.data) {
      return result.data
    } else {
      console.error('Error fetching procedure mappings:', result.error)
      return { surgerySets: [], implantBoxes: [] }
    }
  } catch (error) {
    console.error('Error fetching procedure mappings:', error)
    return { surgerySets: [], implantBoxes: [] }
  }
}

// =============================================================================
// CACHE MANAGEMENT FUNCTIONS
// =============================================================================

export const clearCache = (key?: string): void => {
  if (key) {
    // Clear specific cache entries
    if (key === 'countries') {
      cache.countries = null
    } else if (key === 'caseStatuses') {
      cache.caseStatuses = null
    } else if (key.startsWith('departments_')) {
      const country = key.replace('departments_', '')
      cache.departments.delete(country)
    } else if (key.startsWith('hospitals_')) {
      const country = key.replace('hospitals_', '')
      cache.hospitals.delete(country)
    } else if (key.startsWith('procedureTypes_')) {
      const country = key.replace('procedureTypes_', '')
      cache.procedureTypes.delete(country)
    } else if (key.startsWith('surgerySets_')) {
      const country = key.replace('surgerySets_', '')
      cache.surgerySets.delete(country)
    } else if (key.startsWith('implantBoxes_')) {
      const country = key.replace('implantBoxes_', '')
      cache.implantBoxes.delete(country)
    }
    
    // Also clear any pending requests for this key
    cache.pendingRequests.delete(key)
  } else {
    // Clear all cache - atomic operation to prevent corruption
    cache.countries = null
    cache.caseStatuses = null
    cache.departments.clear()
    cache.hospitals.clear()
    cache.procedureTypes.clear()
    cache.surgerySets.clear()
    cache.implantBoxes.clear()
    cache.pendingRequests.clear()
  }
}

export const refreshCache = async (): Promise<void> => {
  clearCache()
  
  // Pre-load common data
  await Promise.all([
    getCountries(),
    getCaseStatuses(),
    getDepartments(),
    getProcedureTypes()
  ])
}

// =============================================================================
// LEGACY COMPATIBILITY - Static fallbacks for existing code
// =============================================================================

// These provide backward compatibility while transitioning to database-driven constants
export const LEGACY_CONSTANTS = {
  COUNTRIES: ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand'],
  DEPARTMENTS: ['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology', 'General Surgery', 'Pediatrics'],
  PROCEDURE_TYPES: ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine'],
  STATUS_COLORS: {
    'pending': '#ffa500',
    'confirmed': '#0080ff',
    'order-placed': '#8000ff',
    'order-processed': '#ff4080',
    'ready-for-delivery': '#00ff80',
    'out-for-delivery': '#ff8000',
    'delivered': '#4080ff',
    'order-received': '#8080ff',
    'completed': '#00ff00',
    'to-be-billed': '#ffff00',
    'cancelled': '#ff0000',
    'on-hold': '#808080'
  }
}

// Wrapper functions that return promises for async compatibility
export const getCountriesSync = (): string[] => LEGACY_CONSTANTS.COUNTRIES
export const getDepartmentsSync = (): string[] => LEGACY_CONSTANTS.DEPARTMENTS
export const getProcedureTypesSync = (): string[] => LEGACY_CONSTANTS.PROCEDURE_TYPES

// Helper to migrate from sync to async calls
export const migrateToAsync = (component: string): void => {
  console.warn(`Component ${component} is using sync constants. Consider migrating to async getters for real-time data.`)
}

const constantsService = {
  getCountries,
  getCaseStatuses,
  getDepartments,
  getHospitals,
  getProcedureTypes,
  getSurgerySets,
  getImplantBoxes,
  getProcedureMappings,
  getStatusColor,
  getStatusIcon,
  getStatusLabel,
  getStatusWorkflow,
  clearCache,
  refreshCache
};

export default constantsService;