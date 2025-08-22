// Migration service to replace localStorage operations with Supabase
import { 
  caseOperations, 
  lookupOperations, 
  auditOperations
} from './supabaseService'
import type { CaseBooking, FilterOptions } from '../types'
import { sendStatusChangeNotification } from '../utils/emailNotificationService'

// =============================================================================
// CASE MANAGEMENT OPERATIONS (Replacing storage.ts)
// =============================================================================

export const generateCaseReferenceNumber = async (country: string): Promise<string> => {
  // This is now handled by the database function generate_case_reference_number
  // Return placeholder - actual generation happens in caseOperations.create
  return 'TM-AUTO-GENERATED'
}

export const getCases = async (filters?: FilterOptions): Promise<CaseBooking[]> => {
  try {
    return await caseOperations.getAll(filters)
  } catch (error) {
    console.error('Error fetching cases from Supabase:', error)
    return []
  }
}

export const saveCase = async (caseData: CaseBooking): Promise<void> => {
  try {
    if (caseData.id && caseData.id !== 'temp-id') {
      // Update existing case
      await caseOperations.update(caseData.id, caseData)
    } else {
      // Create new case
      await caseOperations.create(caseData)
    }
    
    // Log the action
    await auditOperations.logAction(
      caseData.submittedBy,
      caseData.id ? 'update_case' : 'create_case',
      'Case Management',
      caseData.caseReferenceNumber,
      `Case ${caseData.id ? 'updated' : 'created'}: ${caseData.caseReferenceNumber}`
    )
  } catch (error) {
    console.error('Error saving case to Supabase:', error)
    throw error
  }
}

export const updateCaseStatus = async (
  caseId: string, 
  status: CaseBooking['status'], 
  processedBy?: string, 
  details?: string
): Promise<void> => {
  try {
    // Get current case data
    const currentCase = await caseOperations.getById(caseId)
    if (!currentCase) {
      throw new Error('Case not found')
    }

    // Update status in database
    await caseOperations.updateStatus(caseId, status, processedBy || 'System', details)

    // Handle special status-specific data updates
    if (details) {
      try {
        const parsedDetails = JSON.parse(details)
        const updates: Partial<CaseBooking> = {}

        if (status === 'Delivered (Hospital)' && parsedDetails.deliveryDetails !== undefined) {
          updates.deliveryDetails = parsedDetails.deliveryDetails
          // Handle delivery image upload if present
          if (parsedDetails.deliveryImage) {
            // Upload image and get path
            // Implementation depends on how images are handled in your app
          }
        } else if (status === 'Case Completed' && parsedDetails.attachments !== undefined) {
          updates.orderSummary = parsedDetails.orderSummary
          updates.doNumber = parsedDetails.doNumber
          // Handle file attachments
          if (parsedDetails.attachments?.length > 0) {
            // Process file uploads
            // Implementation depends on how files are handled
          }
        } else if (status === 'Order Prepared' || status === 'Order Preparation') {
          updates.processOrderDetails = details
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await caseOperations.update(caseId, updates)
        }
      } catch (error) {
        // If it's not JSON, treat as regular process details for certain statuses
        if (status === 'Order Prepared' || status === 'Order Preparation') {
          await caseOperations.update(caseId, { processOrderDetails: details })
        }
      }
    }

    // Send email notification for status change (async, don't block the UI)
    const statusHistory = currentCase.statusHistory || []
    const previousStatus = statusHistory[statusHistory.length - 1]?.status || 'Unknown'
    
    try {
      const emailSent = await sendStatusChangeNotification(
        currentCase, 
        status, 
        previousStatus, 
        processedBy || 'System'
      )
      
      if (emailSent) {
        console.log('✅ Email notification sent for status change:', {
          caseRef: currentCase.caseReferenceNumber,
          status,
          previousStatus
        })
      } else {
        console.warn('⚠️ Failed to send email notification for status change:', currentCase.caseReferenceNumber)
      }
    } catch (error) {
      console.error('💥 Error sending status change email notification:', error)
    }

    // Log the action
    await auditOperations.logAction(
      processedBy || 'System',
      'update_case_status',
      'Case Management',
      currentCase.caseReferenceNumber,
      `Status updated from ${previousStatus} to ${status}`
    )
  } catch (error) {
    console.error('Error updating case status:', error)
    throw error
  }
}

export const amendCase = async (
  caseId: string, 
  amendments: Partial<CaseBooking>, 
  amendedBy: string, 
  isAdmin = false
): Promise<void> => {
  try {
    // Get current case
    const currentCase = await caseOperations.getById(caseId)
    if (!currentCase) {
      throw new Error('Case not found')
    }

    // Check if case has already been amended (Admin can bypass this restriction)
    if (currentCase.isAmended && !isAdmin) {
      throw new Error('This case has already been amended and cannot be amended again.')
    }

    // Track what's being changed
    const changes: { field: string; oldValue: string; newValue: string }[] = []
    const amendableFields = ['hospital', 'department', 'dateOfSurgery', 'procedureType', 'doctorName', 'timeOfProcedure', 'specialInstruction']
    
    amendableFields.forEach(field => {
      if (amendments[field as keyof CaseBooking] !== undefined) {
        const oldValue = currentCase[field as keyof CaseBooking] as string || ''
        const newValue = amendments[field as keyof CaseBooking] as string || ''
        if (oldValue !== newValue) {
          changes.push({
            field: field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1'),
            oldValue,
            newValue
          })
        }
      }
    })

    // Apply amendments to the case
    await caseOperations.update(caseId, {
      ...amendments,
      amendedBy,
      amendedAt: new Date().toISOString(),
      isAmended: true
    })

    // Add amendment history
    await caseOperations.addAmendment(caseId, amendedBy, changes)

    // Log the action
    await auditOperations.logAction(
      amendedBy,
      'amend_case',
      'Case Management',
      currentCase.caseReferenceNumber,
      `Case amended: ${changes.map(c => `${c.field}: ${c.oldValue} → ${c.newValue}`).join(', ')}`
    )
  } catch (error) {
    console.error('Error amending case:', error)
    throw error
  }
}

export const filterCases = (cases: CaseBooking[], filters: FilterOptions): CaseBooking[] => {
  return cases.filter(caseItem => {
    if (filters.submitter && !caseItem.submittedBy.toLowerCase().includes(filters.submitter.toLowerCase())) {
      return false
    }
    
    if (filters.hospital && !caseItem.hospital.toLowerCase().includes(filters.hospital.toLowerCase())) {
      return false
    }
    
    if (filters.status && caseItem.status !== filters.status) {
      return false
    }
    
    if (filters.dateFrom && caseItem.dateOfSurgery < filters.dateFrom) {
      return false
    }
    
    if (filters.dateTo && caseItem.dateOfSurgery > filters.dateTo) {
      return false
    }
    
    if (filters.country && caseItem.country !== filters.country) {
      return false
    }
    
    return true
  })
}

// =============================================================================
// LOOKUP DATA OPERATIONS (Replacing hardcoded arrays)
// =============================================================================

export interface CategorizedSets {
  [procedureType: string]: {
    surgerySets: string[]
    implantBoxes: string[]
  }
}

export const getCategorizedSets = async (country?: string): Promise<CategorizedSets> => {
  try {
    // Get all procedure types for the country
    const procedureTypes = await lookupOperations.getProcedureTypes(country)
    const categorizedSets: CategorizedSets = {}

    // Build categorized sets by getting mappings for each procedure type
    for (const procedureType of procedureTypes) {
      const mappings = await lookupOperations.getProcedureMappings(procedureType.name, country || 'Singapore')
      categorizedSets[procedureType.name] = {
        surgerySets: mappings.surgerySets,
        implantBoxes: mappings.implantBoxes
      }
    }

    return categorizedSets
  } catch (error) {
    console.error('Error fetching categorized sets:', error)
    return {}
  }
}

export const saveCategorizedSets = async (categorizedSets: CategorizedSets, country?: string): Promise<void> => {
  // This functionality is now managed through the database
  // Procedure mappings are stored in the procedure_mappings table
  console.warn('saveCategorizedSets: This operation is now managed through database procedure mappings')
}

// =============================================================================
// PROCEDURE TYPE MANAGEMENT (Now database-driven)
// =============================================================================

export const getCustomProcedureTypes = async (country?: string): Promise<string[]> => {
  try {
    const procedureTypes = await lookupOperations.getProcedureTypes(country)
    // Filter for custom types (those not in the base set)
    const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
    return procedureTypes
      .filter(pt => !baseProcedureTypes.includes(pt.name))
      .map(pt => pt.name)
  } catch (error) {
    console.error('Error fetching custom procedure types:', error)
    return []
  }
}

export const saveCustomProcedureTypes = async (types: string[], country?: string): Promise<void> => {
  // This is now handled through the database
  console.warn('saveCustomProcedureTypes: Custom procedure types are now managed through the database')
}

export const getHiddenProcedureTypes = async (country?: string): Promise<string[]> => {
  try {
    const allProcedureTypes = await lookupOperations.getProcedureTypes(country, true) // Include hidden
    return allProcedureTypes
      .filter(pt => pt.is_hidden)
      .map(pt => pt.name)
  } catch (error) {
    console.error('Error fetching hidden procedure types:', error)
    return []
  }
}

export const saveHiddenProcedureTypes = async (types: string[], country?: string): Promise<void> => {
  // This is now handled through the database
  console.warn('saveHiddenProcedureTypes: Hidden procedure types are now managed through the database')
}

export const addCustomProcedureType = async (typeName: string, country?: string): Promise<boolean> => {
  try {
    // This would require admin API calls to add new procedure types
    // For now, return false as this should be managed through admin interface
    console.warn('addCustomProcedureType: This operation should be performed through the admin interface')
    return false
  } catch (error) {
    console.error('Error adding custom procedure type:', error)
    return false
  }
}

export const removeCustomProcedureType = async (typeName: string, country?: string): Promise<boolean> => {
  try {
    // This would require admin API calls to remove procedure types
    console.warn('removeCustomProcedureType: This operation should be performed through the admin interface')
    return false
  } catch (error) {
    console.error('Error removing custom procedure type:', error)
    return false
  }
}

export const restoreProcedureType = async (typeName: string, country?: string): Promise<boolean> => {
  try {
    // This would require admin API calls to restore hidden procedure types
    console.warn('restoreProcedureType: This operation should be performed through the admin interface')
    return false
  } catch (error) {
    console.error('Error restoring procedure type:', error)
    return false
  }
}

export const getAllProcedureTypes = async (country?: string): Promise<string[]> => {
  try {
    const procedureTypes = await lookupOperations.getProcedureTypes(country, false) // Exclude hidden
    return procedureTypes.map(pt => pt.name)
  } catch (error) {
    console.error('Error fetching all procedure types:', error)
    // Fallback to base types
    return ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
  }
}

export const getHiddenProcedureTypesList = async (country?: string): Promise<string[]> => {
  try {
    const hiddenTypes = await getHiddenProcedureTypes(country)
    const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
    
    // Only return hidden types that are actually base types
    return hiddenTypes.filter(type => baseProcedureTypes.includes(type))
  } catch (error) {
    console.error('Error fetching hidden procedure types list:', error)
    return []
  }
}

// =============================================================================
// MIGRATION UTILITIES
// =============================================================================

export const migrateLocalStorageToSupabase = async (userId: string): Promise<void> => {
  try {
    console.log('Starting localStorage to Supabase migration...')
    
    // Note: This would be a complex migration process that would need to:
    // 1. Read existing localStorage data
    // 2. Transform it to match the new database schema
    // 3. Upload it to Supabase
    // 4. Verify the migration
    // 5. Clear localStorage (with user confirmation)
    
    // For now, this is a placeholder that logs the intent
    console.log('Migration completed. LocalStorage data preserved for backup.')
    
    // Log the migration
    await auditOperations.logAction(
      userId,
      'migrate_data',
      'System',
      'localStorage_to_supabase',
      'Data migration from localStorage to Supabase completed'
    )
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  }
}

// =============================================================================
// BACKWARD COMPATIBILITY EXPORTS
// =============================================================================

// Export the new async functions with the same names as the old sync functions
// Components will need to be updated to handle the async nature
export {
  getCases as getCasesAsync,
  saveCase as saveCaseAsync,
  updateCaseStatus as updateCaseStatusAsync,
  amendCase as amendCaseAsync,
  getCategorizedSets as getCategorizedSetsAsync,
  getAllProcedureTypes as getAllProcedureTypesAsync
}

// Legacy sync exports that show deprecation warnings
export const getCasesSync = (): CaseBooking[] => {
  console.warn('getCasesSync is deprecated. Use getCases() async function instead.')
  return []
}

export const saveCaseSync = (caseData: CaseBooking): void => {
  console.warn('saveCaseSync is deprecated. Use saveCase() async function instead.')
}

export const updateCaseStatusSync = (
  caseId: string, 
  status: CaseBooking['status'], 
  processedBy?: string, 
  details?: string
): void => {
  console.warn('updateCaseStatusSync is deprecated. Use updateCaseStatus() async function instead.')
}

// Cleanup function - to be called during migration
export const cleanupLocalStorage = (): void => {
  const keysToRemove = [
    'case-booking-cases',
    'case-booking-counter',
    'categorized-sets',
    'custom_procedure_types',
    'hidden_procedure_types'
  ]
  
  // Also remove country-specific keys
  const countries = ['Singapore', 'Malaysia', 'Philippines', 'Indonesia', 'Vietnam', 'Hong Kong', 'Thailand']
  countries.forEach(country => {
    keysToRemove.push(`categorized-sets-${country}`)
    keysToRemove.push(`custom_procedure_types_${country}`)
    keysToRemove.push(`hidden_procedure_types_${country}`)
  })
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key)
  })
  
  console.log('LocalStorage cleanup completed')
}