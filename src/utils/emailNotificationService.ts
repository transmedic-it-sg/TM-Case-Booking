// Email Notification Service - Connects email config to case workflow
import { CaseBooking } from '../types';
import { getUsers } from './auth';
import { userHasDepartmentAccess, userHasAnyDepartmentAccess } from './departmentUtils';
import { normalizeCountry } from './countryUtils';

export interface EmailNotificationRule {
  status: string;
  enabled: boolean;
  recipients: {
    roles: string[];
    specificEmails: string[];
    includeSubmitter: boolean;
    departmentFilter: string[];
    requireSameDepartment: boolean;
    adminOverride?: boolean; // Allow admin users to bypass role restrictions (default: true)
    adminGlobalAccess?: boolean; // Allow admin users to bypass country restrictions (default: true)
    legacyRoleMapping?: Record<string, string>; // Map old role names to new ones (e.g., "operation-manager" -> "operations-manager")
  };
  template: {
    subject: string;
    body: string;
  };
  conditions?: {
    minUserLevel?: string; // Minimum user level required
    countryRestrictions?: string[]; // Only send for specific countries
    timeRestrictions?: {
      startTime?: string; // Only send after this time (24h format)
      endTime?: string; // Only send before this time (24h format)
      weekdaysOnly?: boolean; // Only send on weekdays
    };
  };
}

export interface EmailNotificationMatrix {
  country: string;
  rules: EmailNotificationRule[];
}

// Get email configuration for a country
export const getEmailConfig = async (country: string) => {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', `email_config_${country}`)
      .single();
      
    if (error || !data) {
      console.warn(`No email config found for country: ${country}`);
      return null;
    }
    
    return data.setting_value;
  } catch (error) {
    console.error('Failed to get email config from database:', error);
    return null;
  }
};

// Default notification matrix used when none is configured
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getDefaultNotificationMatrix = (country: string): EmailNotificationMatrix => {
  return {
    country,
    rules: [
      {
        status: 'Case Booked',
        enabled: true,
        recipients: {
          roles: ['operations', 'operations-manager'],
          specificEmails: [],
          includeSubmitter: false,
          departmentFilter: [],
          requireSameDepartment: true,
          adminOverride: true,
          adminGlobalAccess: true
        },
        template: {
          subject: 'New Case Booked: {{caseReferenceNumber}} - {{hospital}} - {{doctorName}}',
          body: `Dear Team,

A new case has been booked and requires your attention.

Case Details:
• Case Reference: {{caseReferenceNumber}}
• Hospital: {{hospital}}
• Department: {{department}}
• Doctor: {{doctorName}}
• Procedure Type: {{procedureType}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}

Ordered Items with Quantities:
{{quantityInformation}}

Special Instructions: {{specialInstruction}}

Please process this case according to your department's procedures.

Best regards,
TM Case Booking System`
        }
      }
    ]
  };
};

// Get notification matrix for a country
export const getNotificationMatrix = async (country: string): Promise<EmailNotificationMatrix | null> => {
  console.log(`🔍 getNotificationMatrix called for country: "${country}"`);
  
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    // First try to get from email_notification_rules table
    const { data: rules, error } = await supabase
      .from('email_notification_rules')
      .select('*')
      .eq('country', country);
      
    if (!error && rules && rules.length > 0) {
      console.log(`✅ Found ${rules.length} notification rules in database for "${country}"`);
      
      // Convert database format to EmailNotificationMatrix format
      const matrix: EmailNotificationMatrix = {
        country,
        rules: rules.map(rule => ({
          status: rule.status,
          enabled: rule.enabled,
          recipients: rule.recipients,
          template: rule.template,
          conditions: rule.conditions
        }))
      };
      
      return matrix;
    }
    
    console.log(`📋 No rules found in database for "${country}", checking localStorage fallback`);
  } catch (error) {
    console.error('Error querying database for notification matrix:', error);
  }
  
  console.warn(`❌ No notification matrix found for "${country}", returning empty configuration`);
  return { country, rules: [] };
};

// Get OAuth tokens for active provider
export const getActiveProviderTokens = async (country: string) => {
  const config = await getEmailConfig(country);
  if (!config || !config.activeProvider) return null;
  
  const provider = config.providers[config.activeProvider];
  if (!provider || !provider.isAuthenticated || !provider.tokens) return null;
  
  return {
    provider: config.activeProvider,
    tokens: provider.tokens,
    userInfo: provider.userInfo
  };
};

/**
 * Apply template variables to email text with enhanced quantity information
 * 
 * Available template variables:
 * - {{caseReferenceNumber}}, {{hospital}}, {{department}}, {{doctorName}}
 * - {{dateOfSurgery}}, {{timeOfProcedure}}, {{procedureType}}
 * - {{surgerySetsWithQuantities}} - Surgery sets with quantities (e.g., "ALIF DISC PREP ×2, CAPRI EXPANDABLE ×1")
 * - {{implantBoxesWithQuantities}} - Implant boxes with quantities
 * - {{quantityInformation}} - Complete formatted quantity info for both types
 * - {{surgerySetSelection}}, {{implantBox}} - Enhanced with quantities when available, legacy format as fallback
 * - {{specialInstruction}}, {{submittedBy}}, {{status}}, etc.
 * 
 * Backward compatibility: Legacy variables (surgerySetsBasic, implantBoxesBasic) available without quantities
 */
export const applyTemplateVariables = async (template: string, caseData: CaseBooking, additionalVars: Record<string, string> = {}): Promise<string> => {
  let result = template;
  
  console.log('🔄 Applying template variables to:', template.substring(0, 100) + '...');
  console.log('📋 Case data:', {
    caseReference: caseData.caseReferenceNumber,
    hospital: caseData.hospital,
    submittedBy: caseData.submittedBy,
    dateOfSurgery: caseData.dateOfSurgery
  });

  // Load quantity information if case has an ID
  let quantityInfo = '';
  let surgerySetsWithQuantities = '';
  let implantBoxesWithQuantities = '';
  
  if (caseData.id) {
    try {
      const { supabase } = await import('../lib/supabase');
      const { data: quantities, error } = await supabase
        .from('case_booking_quantities')
        .select('item_name, quantity, item_type')
        .eq('case_booking_id', caseData.id);
        
      if (!error && quantities && quantities.length > 0) {
        console.log('📊 Loaded quantities:', quantities);
        
        // Separate surgery sets and implant boxes
        const surgerySets = quantities.filter(q => q.item_type === 'surgery_set');
        const implantBoxes = quantities.filter(q => q.item_type === 'implant_box');
        
        // Format surgery sets with quantities
        if (surgerySets.length > 0) {
          surgerySetsWithQuantities = surgerySets
            .map(q => `${q.item_name} ×${q.quantity}`)
            .join(', ');
        }
        
        // Format implant boxes with quantities
        if (implantBoxes.length > 0) {
          implantBoxesWithQuantities = implantBoxes
            .map(q => `${q.item_name} ×${q.quantity}`)
            .join(', ');
        }
        
        // Create comprehensive quantity information
        const quantityParts = [];
        if (surgerySetsWithQuantities) {
          quantityParts.push(`Surgery Sets: ${surgerySetsWithQuantities}`);
        }
        if (implantBoxesWithQuantities) {
          quantityParts.push(`Implant Boxes: ${implantBoxesWithQuantities}`);
        }
        quantityInfo = quantityParts.join('\n');
        
        console.log('✅ Formatted quantity info:', quantityInfo);
      } else {
        console.log('ℹ️ No quantity data found for case:', caseData.id);
      }
    } catch (error) {
      console.error('❌ Error loading quantity information:', error);
    }
  }
  
  // Case-specific variables with enhanced quantity information
  const variables = {
    // Primary variable names
    caseReferenceNumber: caseData.caseReferenceNumber || 'N/A',
    hospital: caseData.hospital || 'N/A',
    department: caseData.department || 'N/A',
    dateOfSurgery: caseData.dateOfSurgery || 'N/A',
    timeOfProcedure: caseData.timeOfProcedure || 'N/A',
    procedureType: caseData.procedureType || 'N/A',
    procedureName: caseData.procedureName || 'N/A',
    doctorName: caseData.doctorName || 'N/A',
    status: caseData.status || 'N/A',
    submittedBy: caseData.submittedBy || 'N/A',
    submittedAt: caseData.submittedAt ? new Date(caseData.submittedAt).toLocaleDateString() : 'N/A',
    country: caseData.country || 'N/A',
    specialInstruction: caseData.specialInstruction || 'None',
    
    // Enhanced quantity-aware variables
    surgerySetSelection: surgerySetsWithQuantities || (Array.isArray(caseData.surgerySetSelection) ? caseData.surgerySetSelection.join(', ') : 'N/A'),
    implantBox: implantBoxesWithQuantities || (Array.isArray(caseData.implantBox) ? caseData.implantBox.join(', ') : 'N/A'),
    
    // New quantity-specific variables
    surgerySetsWithQuantities: surgerySetsWithQuantities || 'N/A',
    implantBoxesWithQuantities: implantBoxesWithQuantities || 'N/A',
    quantityInformation: quantityInfo || 'No quantity information available',
    
    // Legacy variables (original format without quantities for backward compatibility)
    surgerySetsBasic: Array.isArray(caseData.surgerySetSelection) ? caseData.surgerySetSelection.join(', ') : 'N/A',
    implantBoxesBasic: Array.isArray(caseData.implantBox) ? caseData.implantBox.join(', ') : 'N/A',
    
    processOrderDetails: caseData.processOrderDetails || 'N/A',
    
    // Template aliases (for backward compatibility with email templates)
    caseReference: caseData.caseReferenceNumber || 'N/A',
    date: caseData.dateOfSurgery || 'N/A',
    submitter: caseData.submittedBy || 'N/A',
    procedure: caseData.procedureName || 'N/A',
    doctor: caseData.doctorName || 'N/A',
    specialInstructions: caseData.specialInstruction || 'None',
    
    // Additional template variables
    processedBy: caseData.processedBy || 'N/A',
    processedAt: caseData.processedAt ? new Date(caseData.processedAt).toLocaleDateString() : 'N/A',
    orderSummary: caseData.orderSummary || 'N/A',
    doNumber: caseData.doNumber || 'N/A',
    currentDateTime: new Date().toLocaleString(),
    
    // Additional CaseBooking properties
    deliveryDetails: caseData.deliveryDetails || 'N/A',
    deliveryImage: caseData.deliveryImage || 'N/A',
    attachments: Array.isArray(caseData.attachments) ? caseData.attachments.join(', ') : 'N/A',
    amendedBy: caseData.amendedBy || 'N/A',
    amendedAt: caseData.amendedAt ? new Date(caseData.amendedAt).toLocaleDateString() : 'N/A',
    isAmended: caseData.isAmended ? 'Yes' : 'No',
    
    // Template aliases for quantity information
    surgerySets: surgerySetsWithQuantities || (Array.isArray(caseData.surgerySetSelection) ? caseData.surgerySetSelection.join(', ') : 'N/A'),
    implantBoxes: implantBoxesWithQuantities || (Array.isArray(caseData.implantBox) ? caseData.implantBox.join(', ') : 'N/A'),
    
    ...additionalVars
  };
  
  // Replace all template variables
  console.log('🔧 Available variables:', Object.keys(variables));
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const matches = template.match(regex);
    if (matches) {
      console.log(`✅ Replacing {{${key}}} with "${value}"`);
    }
    result = result.replace(regex, String(value));
  });
  
  // Convert line breaks to HTML <br> tags for email rendering
  result = result.replace(/\n/g, '<br>');
  
  console.log('📧 Final template result:', result.substring(0, 200) + '...');
  return result;
};

// Get recipient email addresses based on notification rule
export const getRecipientEmails = async (
  recipients: EmailNotificationRule['recipients'], 
  caseData: CaseBooking
): Promise<string[]> => {
  const users = await getUsers();
  const recipientEmails: string[] = [];
  
  console.log('🔍 Filtering recipients based on rules:');
  console.log('   - Required roles:', recipients.roles);
  console.log('   - Case country:', caseData.country);
  console.log('   - Case department:', caseData.department);
  console.log('   - Department filter:', recipients.departmentFilter);
  console.log('   - Require same department:', recipients.requireSameDepartment);
  
  // Add role-based recipients
  users.forEach(user => {
    console.log(`\n👤 Evaluating user: ${user.name} (${user.role})`);
    console.log(`   - Email: ${user.email || 'NOT SET'}`);
    console.log(`   - Countries: [${user.countries?.join(', ') || 'none'}]`);
    console.log(`   - Departments: [${user.departments?.join(', ') || 'none'}]`);
    
    // Enhanced role matching with configurable legacy role support
    let hasMatchingRole = recipients.roles.includes(user.role);
    
    // Handle legacy role names using configurable mapping
    if (!hasMatchingRole && recipients.legacyRoleMapping) {
      const mappedRole = recipients.legacyRoleMapping[user.role];
      if (mappedRole && recipients.roles.includes(mappedRole)) {
        hasMatchingRole = true;
        console.log(`   🔄 LEGACY ROLE MAPPING: "${user.role}" → "${mappedRole}"`);
      }
    }
    
    // Fallback for common legacy role mapping (can be removed once all configs are updated)
    if (!hasMatchingRole && user.role === 'operation-manager' && recipients.roles.includes('operations-manager')) {
      hasMatchingRole = true;
      console.log(`   🔄 FALLBACK LEGACY ROLE MATCH: "${user.role}" → "operations-manager"`);
    }
    
    // Check if user has matching role
    if (hasMatchingRole) {
      console.log(`   ✅ Role match: ${user.role}`);
      
      let userAdded = false;
      
      // Standard country and department validation
      if (user.countries && user.countries.includes(caseData.country)) {
        console.log(`   ✅ Country access: ${caseData.country}`);
        
        // Check department filter if specified
        if (recipients.departmentFilter.length > 0) {
          if (!userHasAnyDepartmentAccess(user.departments, recipients.departmentFilter)) {
            console.log(`   ❌ Department filter failed: user doesn't have access to [${recipients.departmentFilter.join(', ')}]`);
            console.log(`   🔍 User departments: [${user.departments?.join(', ') || 'none'}]`);
            return;
          }
          console.log(`   ✅ Department filter passed`);
        }
        
        // Check same department requirement
        if (recipients.requireSameDepartment) {
          if (!userHasDepartmentAccess(user.departments, caseData.department)) {
            console.log(`   ❌ Same department requirement failed: user doesn't have access to "${caseData.department}"`);
            console.log(`   🔍 User departments: [${user.departments?.join(', ') || 'none'}]`);
            return;
          }
          console.log(`   ✅ Same department requirement passed`);
        }
        
        if (user.email) {
          console.log(`   ✅ ADDED TO RECIPIENTS: ${user.email}`);
          recipientEmails.push(user.email);
          userAdded = true;
        } else {
          console.warn(`   ⚠️ User ${user.name} (${user.role}) has no email address configured`);
        }
      } else {
        console.log(`   ❌ Country access denied: user doesn't have access to "${caseData.country}"`);
        
        // Check if admin override is enabled for this notification rule
        // Admin override allows admin users to receive notifications regardless of country restrictions
        const adminOverrideEnabled = recipients.adminOverride !== false; // Default to true if not specified
        
        if (user.role === 'admin' && user.email && adminOverrideEnabled) {
          // Admin users can bypass country restrictions if adminGlobalAccess is enabled
          const adminGlobalAccessEnabled = recipients.adminGlobalAccess !== false; // Default to true if not specified
          
          if (adminGlobalAccessEnabled) {
            console.log(`   👑 Admin global access enabled, checking department filters...`);
            
            // Still check department filters if specified
            if (recipients.departmentFilter.length === 0 || 
                userHasAnyDepartmentAccess(user.departments, recipients.departmentFilter)) {
              
              // Check same department requirement for admin override
              if (!recipients.requireSameDepartment || 
                  userHasDepartmentAccess(user.departments, caseData.department)) {
                
                console.log(`   👑 ADMIN OVERRIDE: Added ${user.email} (admin global access)`);
                recipientEmails.push(user.email);
                userAdded = true;
              } else {
                console.log(`   👑 Admin override blocked by same department requirement`);
              }
            } else {
              console.log(`   👑 Admin override blocked by department filter`);
            }
          } else {
            console.log(`   👑 Admin global access disabled for this rule`);
          }
        }
      }
      
      if (!userAdded) {
        console.log(`   ❌ User not added to recipients due to country/department restrictions`);
      }
    } else {
      console.log(`   ❌ Role mismatch: "${user.role}" not in [${recipients.roles.join(', ')}]`);
    }
  });
  
  // Add specific email addresses
  if (recipients.specificEmails && recipients.specificEmails.length > 0) {
    console.log(`\n📧 Adding specific emails: [${recipients.specificEmails.join(', ')}]`);
    recipientEmails.push(...recipients.specificEmails);
  }
  
  // Add submitter if requested (with country validation)
  if (recipients.includeSubmitter && caseData.submittedBy) {
    console.log(`\n👤 Checking submitter: ${caseData.submittedBy}`);
    // Find submitter's email
    const submitter = users.find(user => user.name === caseData.submittedBy);
    if (submitter && submitter.email) {
      // Validate submitter has access to the case's country (or is admin with global access)
      const hasCountryAccess = submitter.countries && submitter.countries.includes(caseData.country);
      const isAdminWithGlobalAccess = submitter.role === 'admin' && recipients.adminGlobalAccess !== false;
      
      if (hasCountryAccess || isAdminWithGlobalAccess) {
        if (!recipientEmails.includes(submitter.email)) {
          console.log(`   ✅ ADDED SUBMITTER: ${submitter.email} (country access validated)`);
          recipientEmails.push(submitter.email);
        } else {
          console.log(`   ℹ️ Submitter already in recipient list: ${submitter.email}`);
        }
      } else {
        console.log(`   ❌ Submitter doesn't have access to case country: ${caseData.country}`);
        console.log(`   🔍 Submitter countries: [${submitter.countries?.join(', ') || 'none'}]`);
      }
    } else {
      console.log(`   ❌ Submitter not found or has no email`);
    }
  }
  
  const finalEmails = Array.from(new Set(recipientEmails)); // Remove duplicates
  console.log(`\n📊 FINAL RECIPIENT SUMMARY:`);
  console.log(`   - Total unique recipients: ${finalEmails.length}`);
  console.log(`   - Recipients: [${finalEmails.join(', ')}]`);
  
  if (finalEmails.length === 0) {
    console.warn(`\n⚠️ WARNING: No recipients found!`);
    console.warn(`   Check that users have:`);
    console.warn(`   1. Correct roles: [${recipients.roles.join(', ')}]`);
    console.warn(`   2. Access to country: ${caseData.country}`);
    console.warn(`   3. Email addresses configured`);
    console.warn(`   4. Department access (if required)`);
  }
  
  return finalEmails;
};

// Convert case attachments to email attachment format
export const prepareEmailAttachments = (caseData: CaseBooking, statusChange?: string): Array<{
  filename: string;
  content: string; // base64 encoded content
  contentType: string;
}> => {
  const emailAttachments: Array<{
    filename: string;
    content: string;
    contentType: string;
  }> = [];
  
  try {
    // Include case completion attachments (when case completed)
    if (statusChange === 'Case Completed' && caseData.attachments && caseData.attachments.length > 0) {
      caseData.attachments.forEach((attachment, index) => {
        // Attachment is stored as base64 string, extract content and type
        if (attachment.startsWith('data:')) {
          const [header, content] = attachment.split(',');
          const contentType = header.split(':')[1].split(';')[0];
          
          emailAttachments.push({
            filename: `case_completion_${index + 1}.${getFileExtension(contentType)}`,
            content: content,
            contentType: contentType
          });
        }
      });
    }
    
    // Include delivery image (when delivered to hospital)
    if (statusChange === 'Delivered (Hospital)' && caseData.deliveryImage) {
      const attachment = caseData.deliveryImage;
      if (attachment.startsWith('data:')) {
        const [header, content] = attachment.split(',');
        const contentType = header.split(':')[1].split(';')[0];
        
        emailAttachments.push({
          filename: `delivery_confirmation.${getFileExtension(contentType)}`,
          content: content,
          contentType: contentType
        });
      }
    }
    
    console.log(`📎 Prepared ${emailAttachments.length} email attachments for status: ${statusChange}`);
  } catch (error) {
    console.error('💥 Error preparing email attachments:', error);
  }
  
  return emailAttachments;
};

// Helper function to get file extension from content type
const getFileExtension = (contentType: string): string => {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'text/plain': 'txt',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  
  return extensions[contentType] || 'bin';
};

// Validate Email Notification Rule configuration
export const validateNotificationRule = (rule: EmailNotificationRule): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  if (!rule.status || typeof rule.status !== 'string') {
    errors.push('Status is required and must be a string');
  }
  
  if (typeof rule.enabled !== 'boolean') {
    errors.push('Enabled flag must be a boolean');
  }
  
  if (!rule.recipients) {
    errors.push('Recipients configuration is required');
  } else {
    if (!Array.isArray(rule.recipients.roles)) {
      errors.push('Recipients roles must be an array');
    }
    
    if (!Array.isArray(rule.recipients.specificEmails)) {
      errors.push('Specific emails must be an array');
    }
    
    if (typeof rule.recipients.includeSubmitter !== 'boolean') {
      errors.push('Include submitter must be a boolean');
    }
    
    if (!Array.isArray(rule.recipients.departmentFilter)) {
      errors.push('Department filter must be an array');
    }
    
    if (typeof rule.recipients.requireSameDepartment !== 'boolean') {
      errors.push('Require same department must be a boolean');
    }
    
    // Validate optional fields
    if (rule.recipients.adminOverride !== undefined && typeof rule.recipients.adminOverride !== 'boolean') {
      errors.push('Admin override must be a boolean');
    }
    
    if (rule.recipients.adminGlobalAccess !== undefined && typeof rule.recipients.adminGlobalAccess !== 'boolean') {
      errors.push('Admin global access must be a boolean');
    }
    
    if (rule.recipients.legacyRoleMapping !== undefined && typeof rule.recipients.legacyRoleMapping !== 'object') {
      errors.push('Legacy role mapping must be an object');
    }
  }
  
  if (!rule.template) {
    errors.push('Template configuration is required');
  } else {
    if (!rule.template.subject || typeof rule.template.subject !== 'string') {
      errors.push('Template subject is required and must be a string');
    }
    
    if (!rule.template.body || typeof rule.template.body !== 'string') {
      errors.push('Template body is required and must be a string');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Check if email notifications are globally enabled for the application
export const areEmailNotificationsEnabled = async (): Promise<boolean> => {
  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    // Check from system_settings table first
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'emailNotificationsEnabled')
      .single();
      
    if (!error && data && data.setting_value !== null) {
      return data.setting_value === true || data.setting_value === 'true';
    }
    
    console.log('No system setting found, checking localStorage fallback');
  } catch (error) {
    console.error('Error querying system settings:', error);
  }
  
  try {
    // Fallback to localStorage for backward compatibility
    const systemConfig = localStorage.getItem('emailNotificationsEnabled');
    if (systemConfig !== null) {
      return systemConfig === 'true';
    }

    // Fallback to old app-settings format
    const globalSettings = localStorage.getItem('app-settings');
    if (globalSettings) {
      const settings = JSON.parse(globalSettings);
      return settings.emailNotificationsEnabled !== false; // Default to true
    }
    return true; // Default to enabled if no settings found
  } catch (error) {
    console.warn('Failed to check global email notification settings from localStorage:', error);
    return true; // Default to enabled on error
  }
};

// Send email notification for case status change
export const sendCaseStatusNotification = async (
  caseData: CaseBooking, 
  newStatus: string,
  additionalInfo: Record<string, string> = {}
): Promise<boolean> => {
  try {
    console.log('🔔 Attempting to send email notification:', {
      caseRef: caseData.caseReferenceNumber,
      status: newStatus,
      country: caseData.country
    });
    
    // Check if email notifications are globally enabled
    if (!(await areEmailNotificationsEnabled())) {
      console.log('📵 Email notifications are globally disabled');
      return false;
    }

    // DEBUG: Check localStorage directly
    console.log('🔍 DEBUG: Checking localStorage for notification matrix...');
    const matrixKey = 'email-matrix-configs-by-country';
    const storedMatrix = localStorage.getItem(matrixKey);
    console.log('📋 Stored matrix raw:', storedMatrix ? 'Found' : 'Not found');
    if (storedMatrix) {
      try {
        const parsed = JSON.parse(storedMatrix);
        console.log('📊 Available countries in matrix:', Object.keys(parsed));
        if (parsed[caseData.country]) {
          console.log(`✅ Matrix found for ${caseData.country}, rules count:`, parsed[caseData.country].rules?.length);
        } else {
          console.warn(`❌ No matrix found for ${caseData.country}, available:`, Object.keys(parsed));
        }
      } catch (e) {
        console.error('❌ Error parsing matrix:', e);
      }
    }

    // Convert country code to full country name for email configuration lookup
    const fullCountryName = normalizeCountry(caseData.country);
    
    // Get notification matrix for the case's country
    const notificationMatrix = await getNotificationMatrix(fullCountryName);
    if (!notificationMatrix) {
      console.warn('⚠️ No email notification matrix found for country:', caseData.country);
      console.warn('💡 Solution: Visit Email Configuration page to initialize notification rules');
      console.warn('🔍 Expected database table: "email_notification_rules" or localStorage key: "email-matrix-configs-by-country"');
      return false;
    }
    
    console.log('✅ Notification matrix found for country:', caseData.country);
    console.log('📋 Total rules in matrix:', notificationMatrix.rules.length);

    // Find the notification rule for this status
    const statusRule = notificationMatrix.rules.find(rule => rule.status === newStatus);
    if (!statusRule) {
      console.warn(`❌ No notification rule found for status: "${newStatus}"`);
      console.warn('📋 Available statuses in matrix:', notificationMatrix.rules.map(r => r.status));
      console.warn('💡 Solution: Visit Email Configuration → Notification Rules and configure this status');
      return false;
    }
    
    // Validate the notification rule configuration
    const validation = validateNotificationRule(statusRule);
    if (!validation.isValid) {
      console.error(`❌ Invalid notification rule configuration for status: "${newStatus}"`);
      console.error('🔍 Validation errors:', validation.errors);
      console.error('💡 Solution: Fix the notification rule configuration in Email Configuration');
      return false;
    }
    
    if (!statusRule.enabled) {
      console.log(`📵 Email notifications disabled for status: "${newStatus}"`);
      console.log('💡 Enable this status in Email Configuration → Notification Rules');
      return false;
    }
    
    console.log(`✅ Found enabled notification rule for: "${newStatus}"`);
    console.log('👥 Configured roles:', statusRule.recipients.roles);
    console.log('📧 Specific emails:', statusRule.recipients.specificEmails);
    console.log('🔄 Include submitter:', statusRule.recipients.includeSubmitter);

    // Get OAuth tokens for active provider
    const authData = await getActiveProviderTokens(caseData.country);
    if (!authData) {
      console.warn('🔐 No authenticated email provider found for country:', caseData.country);
      return false;
    }

    // Get recipient email addresses
    console.log('🚨 CRITICAL DEBUG: About to call getRecipientEmails');
    console.log('📋 Status rule recipients config:', statusRule.recipients);
    const recipientEmails = await getRecipientEmails(statusRule.recipients, caseData);
    console.log('🚨 CRITICAL DEBUG: getRecipientEmails returned:', recipientEmails);
    
    if (recipientEmails.length === 0) {
      console.warn('📭 No recipient emails found for rules:', statusRule.recipients);
      return false;
    }

    // Apply template variables with quantity information
    const subject = await applyTemplateVariables(statusRule.template.subject, caseData, additionalInfo);
    const body = await applyTemplateVariables(statusRule.template.body, caseData, additionalInfo);
    
    // Prepare attachments for email
    const attachments = prepareEmailAttachments(caseData, newStatus);

    // Import OAuth service dynamically to avoid circular dependencies
    const { createOAuthManager } = await import('./simplifiedOAuth');
    const oauthService = createOAuthManager(authData.provider as 'google' | 'microsoft');

    // Send email with attachments
    const emailSent = await oauthService.sendEmail(authData.tokens.accessToken, {
      to: recipientEmails,
      subject: subject,
      body: body,
      from: authData.userInfo?.name || 'Case Booking System',
      attachments: attachments.length > 0 ? attachments : undefined
    });

    if (emailSent) {
      console.log('✅ Email notification sent successfully:', {
        caseRef: caseData.caseReferenceNumber,
        status: newStatus,
        recipients: recipientEmails,
        provider: authData.provider
      });
      return true;
    } else {
      console.error('❌ Failed to send email notification');
      return false;
    }

  } catch (error) {
    console.error('💥 Error sending email notification:', error);
    return false;
  }
};

// Send notification for new case creation
export const sendNewCaseNotification = async (caseData: CaseBooking): Promise<boolean> => {
  return sendCaseStatusNotification(caseData, 'Case Booked', {
    eventType: 'New Case Created'
  });
};

// Send notification for case status updates
export const sendStatusChangeNotification = async (
  caseData: CaseBooking, 
  newStatus: string, 
  previousStatus: string,
  userWhoChanged: string
): Promise<boolean> => {
  return sendCaseStatusNotification(caseData, newStatus, {
    eventType: 'Status Change',
    previousStatus: previousStatus,
    changedBy: userWhoChanged,
    changedAt: new Date().toLocaleString()
  });
};

// Enhanced notification system that handles both email and push notifications
export const sendUnifiedNotification = async (
  caseData: CaseBooking,
  status: string,
  additionalInfo: Record<string, string> = {}
): Promise<{ email: boolean; push: boolean }> => {
  const results = { email: false, push: false };
  
  try {
    // Send email notification
    results.email = await sendCaseStatusNotification(caseData, status, additionalInfo);
    
    // Send push notification to current user if they are the case submitter or have access
    const { getCurrentUser } = await import('./auth');
    const currentUser = getCurrentUser();
    
    if (currentUser) {
      // Check if user should receive push notification based on email configuration rules
      const shouldReceivePush = await shouldUserReceivePushNotification(currentUser, caseData, status);
      
      if (shouldReceivePush) {
        const { pushNotificationService } = await import('../services/pushNotificationService');
        
        const title = `Case ${status}`;
        const body = `${caseData.caseReferenceNumber} - ${caseData.hospital}`;
        
        await pushNotificationService.sendCaseNotification(title, body, {
          caseId: caseData.id || '',
          caseReferenceNumber: caseData.caseReferenceNumber,
          status: status,
          type: status === 'Case Booked' ? 'new-case' : 'status-change'
        });
        
        results.push = true;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error sending unified notification:', error);
    return results;
  }
};

// Check if user should receive push notification based on email configuration
const shouldUserReceivePushNotification = async (
  user: any,
  caseData: CaseBooking,
  status: string
): Promise<boolean> => {
  try {
    // Get notification matrix for the case's country
    const { normalizeCountry } = await import('./countryUtils');
    const fullCountryName = normalizeCountry(caseData.country);
    const notificationMatrix = await getNotificationMatrix(fullCountryName);
    
    if (!notificationMatrix) return false;
    
    // Find the notification rule for this status
    const statusRule = notificationMatrix.rules.find(rule => rule.status === status);
    if (!statusRule || !statusRule.enabled) return false;
    
    // Check if current user would be a recipient based on email rules (includes country validation)
    const recipientEmails = await getRecipientEmails(statusRule.recipients, caseData);
    
    // Check if user's email is in the recipient list (this already includes submitter validation with country access)
    if (user.email && recipientEmails.includes(user.email)) {
      console.log(`   ✅ User eligible for push notification: ${user.email}`);
      return true;
    }
    
    console.log(`   ❌ User not eligible for push notification: ${user.email || 'NO EMAIL'}`);
    return false;
  } catch (error) {
    console.error('Error checking push notification eligibility:', error);
    return false;
  }
};