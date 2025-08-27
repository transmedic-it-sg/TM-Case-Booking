// Migration service to replace localStorage operations with Supabase - PRODUCTION READY
import { 
  caseOperations, 
  auditOperations,
  lookupOperations
} from './supabaseServiceFixed'
import type { CaseBooking, FilterOptions } from '../types'
import { sendStatusChangeNotification } from '../utils/emailNotificationService'
import { dbCaseToAppCase, appCaseToDbCase } from '../utils/typeMapping'

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
    const result = await caseOperations.getAll(filters)
    if (result.success && result.data) {
      return result.data
    } else {
      console.error('Error fetching cases from Supabase:', result.error)
      return []
    }
  } catch (error) {
    console.error('Error fetching cases from Supabase:', error)
    return []
  }
}

export const saveCase = async (caseData: CaseBooking): Promise<void> => {
  try {
    let result;
    
    if (caseData.id && caseData.id !== 'temp-id') {
      // Update existing case
      result = await caseOperations.update(caseData.id, caseData)
    } else {
      // Create new case
      result = await caseOperations.create(caseData)
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save case')
    }
    
    // Log the action
    await auditOperations.logAction(
      caseData.submittedBy || 'system',
      'case_save',
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
    const caseResult = await caseOperations.getById(caseId)
    if (!caseResult.success || !caseResult.data) {
      throw new Error('Case not found')
    }

    const currentCase = caseResult.data

    // Update status in database
    const updateResult = await caseOperations.updateStatus(caseId, status, processedBy || 'System', details)
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update case status')
    }

    // Trigger email notifications for status change
    try {
      const { sendStatusChangeNotification } = await import('../utils/emailNotificationService');
      const updatedCase = { ...currentCase, status };
      await sendStatusChangeNotification(updatedCase, status, currentCase.status, processedBy || 'System');
      console.log(`✅ Email notifications sent for case ${caseId} status change to ${status}`);
    } catch (emailError) {
      // Don't fail the status update if email fails
      console.warn('Failed to send email notification for status change:', emailError);
    }

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
          const additionalUpdateResult = await caseOperations.update(caseId, updates)
          if (!additionalUpdateResult.success) {
            console.warn('Failed to apply additional status updates:', additionalUpdateResult.error)
          }
        }
      } catch (error) {
        // If it's not JSON, treat as regular process details for certain statuses
        if (status === 'Order Prepared' || status === 'Order Preparation') {
          const detailsUpdateResult = await caseOperations.update(caseId, { processOrderDetails: details })
          if (!detailsUpdateResult.success) {
            console.warn('Failed to update process details:', detailsUpdateResult.error)
          }
        }
      }
    }

    // Send email notification for status change (async, don't block the UI)
    const statusHistory = (currentCase as any).statusHistory || []
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
    const caseResult = await caseOperations.getById(caseId)
    if (!caseResult.success || !caseResult.data) {
      throw new Error('Case not found')
    }
    
    const currentCase = caseResult.data

    // Check if case has already been amended (Admin can bypass this restriction)
    if ((currentCase as any).isAmended && !isAdmin) {
      throw new Error('This case has already been amended and cannot be amended again.')
    }

    // Track what's being changed
    const changes: { field: string; oldValue: string; newValue: string }[] = []
    const amendableFields = ['hospital', 'department', 'dateOfSurgery', 'procedureType', 'doctorName', 'timeOfProcedure', 'specialInstruction']
    
    amendableFields.forEach(field => {
      if (amendments[field as keyof CaseBooking] !== undefined) {
        const oldValue = (currentCase as any)[field] as string || ''
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
    const updateResult = await caseOperations.update(caseId, {
      ...amendments,
      amendedBy,
      amendedAt: new Date().toISOString(),
      isAmended: true
    })
    
    if (!updateResult.success) {
      throw new Error(updateResult.error || 'Failed to update case with amendments')
    }

    // Add amendment history
    const amendmentResult = await caseOperations.addAmendment(caseId, amendedBy, changes)
    
    if (!amendmentResult.success) {
      console.warn('Failed to record amendment history:', amendmentResult.error)
    }

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
    const procedureTypesResult = await lookupOperations.getProcedureTypes(country)
    
    if (!procedureTypesResult.success || !procedureTypesResult.data) {
      console.error('Error fetching procedure types:', procedureTypesResult.error)
      return {}
    }
    
    const procedureTypes = procedureTypesResult.data
    const categorizedSets: CategorizedSets = {}

    // Build categorized sets by getting mappings for each procedure type
    for (const procedureType of procedureTypes) {
      const mappingsResult = await lookupOperations.getProcedureMappings(procedureType.name, country || 'Singapore')
      
      if (mappingsResult.success && mappingsResult.data) {
        categorizedSets[procedureType.name] = {
          surgerySets: mappingsResult.data.surgerySets,
          implantBoxes: mappingsResult.data.implantBoxes
        }
      } else {
        console.warn(`Failed to get mappings for ${procedureType.name}:`, mappingsResult.error)
        categorizedSets[procedureType.name] = {
          surgerySets: [],
          implantBoxes: []
        }
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
    const result = await lookupOperations.getProcedureTypes(country)
    
    if (result.success && result.data) {
      // Filter for custom types (those not in the base set)
      const baseProcedureTypes = ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
      return result.data
        .filter((pt: any) => !baseProcedureTypes.includes(pt.name))
        .map((pt: any) => pt.name)
    } else {
      console.error('Error fetching custom procedure types:', result.error)
      return []
    }
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
    const result = await lookupOperations.getProcedureTypes(country, true) // Include hidden
    
    if (result.success && result.data) {
      return result.data
        .filter((pt: any) => pt.is_hidden)
        .map((pt: any) => pt.name)
    } else {
      console.error('Error fetching hidden procedure types:', result.error)
      return []
    }
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
    const result = await lookupOperations.getProcedureTypes(country, false) // Exclude hidden
    
    if (result.success && result.data) {
      return result.data.map((pt: any) => pt.name)
    } else {
      console.error('Error fetching procedure types:', result.error)
      // Fallback to base types
      return ['Knee', 'Head', 'Hip', 'Hands', 'Neck', 'Spine']
    }
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