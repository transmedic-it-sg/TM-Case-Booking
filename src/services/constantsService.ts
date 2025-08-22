// Database-driven constants service to replace hardcoded values
import { lookupOperations } from './supabaseService'

// =============================================================================
// CACHE MANAGEMENT
// =============================================================================

interface ConstantsCache {
  countries: any[]
  caseStatuses: any[]
  departments: { [country: string]: any[] }
  hospitals: { [country: string]: any[] }
  procedureTypes: { [country: string]: any[] }
  surgerySets: { [country: string]: any[] }
  implantBoxes: { [country: string]: any[] }
  lastUpdated: { [key: string]: number }
}

const cache: ConstantsCache = {
  countries: [],
  caseStatuses: [],
  departments: {},
  hospitals: {},
  procedureTypes: {},
  surgerySets: {},
  implantBoxes: {},
  lastUpdated: {}
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

const isCacheValid = (key: string): boolean => {
  const lastUpdated = cache.lastUpdated[key]
  if (!lastUpdated) return false
  return Date.now() - lastUpdated < CACHE_DURATION
}

const setCacheTimestamp = (key: string): void => {
  cache.lastUpdated[key] = Date.now()
}

// =============================================================================
// COUNTRIES
// =============================================================================

export const getCountries = async (): Promise<string[]> => {
  if (isCacheValid('countries') && cache.countries.length > 0) {
    return cache.countries.map(c => c.name)
  }

  try {
    const countries = await lookupOperations.getCountries()
    cache.countries = countries
    setCacheTimestamp('countries')
    return countries.map((c: any) => c.name)
  } catch (error) {
    console.error('Error fetching countries:', error)
    // Fallback to hardcoded values
    return ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand']
  }
}

export const getCountryByCode = async (code: string): Promise<string | null> => {
  const countries = cache.countries.length > 0 ? cache.countries : await lookupOperations.getCountries()
  const country = countries.find((c: any) => c.code === code)
  return country?.name || null
}

// =============================================================================
// CASE STATUSES (Database-driven)
// =============================================================================

export const getCaseStatuses = async (): Promise<any[]> => {
  if (isCacheValid('caseStatuses') && cache.caseStatuses.length > 0) {
    return cache.caseStatuses
  }

  try {
    const statuses = await lookupOperations.getCaseStatuses()
    cache.caseStatuses = statuses
    setCacheTimestamp('caseStatuses')
    return statuses
  } catch (error) {
    console.error('Error fetching case statuses:', error)
    // Fallback to hardcoded values
    return [
      { status_key: 'pending', display_name: 'Pending', color: '#ffa500', icon: 'clock', sort_order: 1 },
      { status_key: 'confirmed', display_name: 'Confirmed', color: '#0080ff', icon: 'check', sort_order: 2 },
      { status_key: 'order-placed', display_name: 'Order Placed', color: '#8000ff', icon: 'shopping-cart', sort_order: 3 },
      { status_key: 'order-processed', display_name: 'Order Processed', color: '#ff4080', icon: 'package', sort_order: 4 },
      { status_key: 'ready-for-delivery', display_name: 'Ready for Delivery', color: '#00ff80', icon: 'truck-loading', sort_order: 5 },
      { status_key: 'out-for-delivery', display_name: 'Out for Delivery', color: '#ff8000', icon: 'truck', sort_order: 6 },
      { status_key: 'delivered', display_name: 'Delivered', color: '#4080ff', icon: 'check-circle', sort_order: 7 },
      { status_key: 'order-received', display_name: 'Order Received', color: '#8080ff', icon: 'clipboard-check', sort_order: 8 },
      { status_key: 'completed', display_name: 'Completed', color: '#00ff00', icon: 'check-double', sort_order: 9 },
      { status_key: 'to-be-billed', display_name: 'To Be Billed', color: '#ffff00', icon: 'dollar-sign', sort_order: 10 },
      { status_key: 'cancelled', display_name: 'Cancelled', color: '#ff0000', icon: 'times', sort_order: 11 },
      { status_key: 'on-hold', display_name: 'On Hold', color: '#808080', icon: 'pause', sort_order: 12 }
    ]
  }
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
  const cacheKey = country || 'global'
  
  if (isCacheValid(`departments_${cacheKey}`) && cache.departments[cacheKey]?.length > 0) {
    return cache.departments[cacheKey].map(d => d.name)
  }

  try {
    const departments = await lookupOperations.getDepartments(country)
    cache.departments[cacheKey] = departments
    setCacheTimestamp(`departments_${cacheKey}`)
    return departments.map(d => d.name)
  } catch (error) {
    console.error('Error fetching departments:', error)
    // Fallback to hardcoded values
    return ['Cardiology', 'Orthopedics', 'Neurosurgery', 'Oncology', 'Emergency', 'Radiology', 'General Surgery', 'Pediatrics']
  }
}

// =============================================================================
// HOSPITALS (Country-specific)
// =============================================================================

export const getHospitals = async (country?: string): Promise<string[]> => {
  const cacheKey = country || 'global'
  
  if (isCacheValid(`hospitals_${cacheKey}`) && cache.hospitals[cacheKey]?.length > 0) {
    return cache.hospitals[cacheKey].map(h => h.name)
  }

  try {
    const hospitals = await lookupOperations.getHospitals(country)
    cache.hospitals[cacheKey] = hospitals
    setCacheTimestamp(`hospitals_${cacheKey}`)
    return hospitals.map(h => h.name)
  } catch (error) {
    console.error('Error fetching hospitals:', error)
    // Return empty array if no hospitals found, let user input custom values
    return []
  }
}

// =============================================================================
// PROCEDURE TYPES (Country-specific)
// =============================================================================

export const getProcedureTypes = async (country?: string): Promise<string[]> => {
  const cacheKey = country || 'global'
  
  if (isCacheValid(`procedureTypes_${cacheKey}`) && cache.procedureTypes[cacheKey]?.length > 0) {
    return cache.procedureTypes[cacheKey].map(p => p.name)
  }

  try {
    const procedureTypes = await lookupOperations.getProcedureTypes(country, false) // Exclude hidden
    cache.procedureTypes[cacheKey] = procedureTypes
    setCacheTimestamp(`procedureTypes_${cacheKey}`)
    return procedureTypes.map(p => p.name)
  } catch (error) {
    console.error('Error fetching procedure types:', error)
    // Fallback to hardcoded values
    return ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
  }
}

// =============================================================================
// SURGERY SETS (Country-specific)
// =============================================================================

export const getSurgerySets = async (country?: string): Promise<string[]> => {
  const cacheKey = country || 'global'
  
  if (isCacheValid(`surgerySets_${cacheKey}`) && cache.surgerySets[cacheKey]?.length > 0) {
    return cache.surgerySets[cacheKey].map(s => s.name)
  }

  try {
    const surgerySets = await lookupOperations.getSurgerySets(country)
    cache.surgerySets[cacheKey] = surgerySets
    setCacheTimestamp(`surgerySets_${cacheKey}`)
    return surgerySets.map(s => s.name)
  } catch (error) {
    console.error('Error fetching surgery sets:', error)
    // Fallback to hardcoded values
    return [
      'Comprehensive Spine Fusion Set',
      'Advanced Joint Replacement Kit',
      'Precision Sports Medicine Collection',
      'Complete Trauma Surgery Package',
      'Specialized Minimally Invasive Set',
      'Elite Orthopedic Reconstruction Kit',
      'Premium Surgical Navigation Tools'
    ]
  }
}

// =============================================================================
// IMPLANT BOXES (Country-specific)
// =============================================================================

export const getImplantBoxes = async (country?: string): Promise<string[]> => {
  const cacheKey = country || 'global'
  
  if (isCacheValid(`implantBoxes_${cacheKey}`) && cache.implantBoxes[cacheKey]?.length > 0) {
    return cache.implantBoxes[cacheKey].map(b => b.name)
  }

  try {
    const implantBoxes = await lookupOperations.getImplantBoxes(country)
    cache.implantBoxes[cacheKey] = implantBoxes
    setCacheTimestamp(`implantBoxes_${cacheKey}`)
    return implantBoxes.map(b => b.name)
  } catch (error) {
    console.error('Error fetching implant boxes:', error)
    // Fallback to hardcoded values
    return [
      'Spinal Implant Collection Box',
      'Joint Replacement Implant Set',
      'Sports Medicine Implant Kit',
      'Trauma Implant System Box',
      'Minimally Invasive Implant Set',
      'Reconstruction Implant Package',
      'Specialized Implant Collection'
    ]
  }
}

// =============================================================================
// PROCEDURE MAPPINGS
// =============================================================================

export const getProcedureMappings = async (procedureType: string, country?: string) => {
  try {
    return await lookupOperations.getProcedureMappings(procedureType, country || 'Singapore')
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
    delete cache.lastUpdated[key]
    // Clear specific cache entries
    if (key === 'countries') cache.countries = []
    else if (key === 'caseStatuses') cache.caseStatuses = []
    else if (key.startsWith('departments_')) {
      const cacheKey = key.replace('departments_', '')
      delete cache.departments[cacheKey]
    }
    // Add more specific cache clearing as needed
  } else {
    // Clear all cache
    Object.keys(cache.lastUpdated).forEach(k => delete cache.lastUpdated[k])
    cache.countries = []
    cache.caseStatuses = []
    cache.departments = {}
    cache.hospitals = {}
    cache.procedureTypes = {}
    cache.surgerySets = {}
    cache.implantBoxes = {}
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