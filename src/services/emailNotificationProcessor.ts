/**
 * Email Notification Processor - Connects Email Configuration with Case Updates
 * Processes notification rules and sends emails when cases change status
 */

import { CaseBooking, CaseStatus } from '../types';
import { getAllSupabaseUsers } from '../utils/supabaseUserService';
import { getEmailConfigFromDatabase } from '../components/SimplifiedEmailConfig';
import { centralizedEmailService } from './centralizedEmailService';
// Email sent via Supabase Edge Function - now using centralized admin authentication
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

interface NotificationRule {
  enabled: boolean;
  roles: string[];
  includeSubmitter: boolean;
  requireSameDepartment: boolean;
  adminOverride: boolean;
  adminGlobalAccess: boolean;
  departmentFilter?: string[];
}

interface EmailConfig {
  [status: string]: NotificationRule;
}

/**
 * Process email notifications for case status changes
 */
export const processEmailNotifications = async (
  caseData: CaseBooking,
  newStatus: CaseStatus,
  oldStatus?: CaseStatus,
  changedBy?: string
): Promise<void> => {
  console.log('📧 EMAIL PROCESSOR DEBUG - Function Entry:', {
    timestamp: new Date().toISOString(),
    caseId: caseData.id,
    caseRef: caseData.caseReferenceNumber,
    newStatus,
    oldStatus,
    changedBy,
    country: caseData.country,
    hospital: caseData.hospital,
    department: caseData.department,
    hasGetEmailConfigFromDatabase: typeof getEmailConfigFromDatabase === 'function'
  });

  try {
    // CRITICAL FIX: Use centralized admin email service instead of user-based tokens
    console.log('📧 EMAIL PROCESSOR DEBUG - Using centralized admin email service:', {
      country: caseData.country,
      service: 'centralizedEmailService'
    });

    // Check if admin email configuration exists for this country
    const adminCredentials = await centralizedEmailService.getAdminEmailConfig(caseData.country);
    
    console.log('📧 EMAIL PROCESSOR DEBUG - Admin email config check:', {
      country: caseData.country,
      hasAdminConfig: !!adminCredentials,
      provider: adminCredentials?.provider,
      fromEmail: adminCredentials?.fromEmail,
      isTokenValid: adminCredentials ? Date.now() < adminCredentials.expiresAt : false
    });
    
    if (!adminCredentials) {
      console.log('⚠️ EMAIL PROCESSOR DEBUG - No admin email configuration found, skipping email notifications:', {
        country: caseData.country,
        message: 'Admin email credentials required. Configure email authentication in settings.',
        caseId: caseData.id,
        status: newStatus
      });
      // Don't throw error - just skip email notifications gracefully
      return;
    }

    // Get notification rule from email_notification_rules table
    console.log('📧 EMAIL PROCESSOR DEBUG - Fetching notification rule:', {
      country: caseData.country,
      status: newStatus,
      queryParams: {
        table: 'email_notification_rules',
        filters: {
          country: caseData.country,
          status: newStatus,
          enabled: true
        }
      }
    });

    const { supabase } = await import('../lib/supabase');
    
    // First, check what rules exist for debugging
    const { data: allRules } = await supabase
      .from('email_notification_rules')
      .select('status, country, enabled')
      .eq('country', caseData.country)
      .eq('enabled', true);
    
    console.log('📧 EMAIL PROCESSOR DEBUG - Available rules for country:', {
      country: caseData.country,
      requestedStatus: newStatus,
      availableRules: allRules?.map(r => r.status) || [],
      exactStatusMatch: allRules?.some(r => r.status === newStatus),
      statusComparison: allRules?.map(r => ({
        ruleStatus: r.status,
        requestedStatus: newStatus,
        match: r.status === newStatus,
        ruleLength: r.status.length,
        requestLength: newStatus.length
      })) || []
    });
    
    const { data: notificationRule, error } = await supabase
      .from('email_notification_rules')
      .select('*')
      .eq('country', caseData.country)
      .eq('status', newStatus)
      .eq('enabled', true)
      .single();

    console.log('📧 EMAIL PROCESSOR DEBUG - Notification rule query result:', {
      country: caseData.country,
      status: newStatus,
      hasNotificationRule: !!notificationRule,
      error: error,
      notificationRule: notificationRule,
      querySuccess: !error && !!notificationRule
    });

    if (error || !notificationRule) {
      console.log('❌ EMAIL PROCESSOR DEBUG - No notification rule found:', {
        country: caseData.country,
        status: newStatus,
        error: error,
        errorMessage: error?.message,
        errorCode: error?.code,
        notificationRule: notificationRule
      });
      return;
    }

    // CRITICAL FIX: Admin credentials validated - no individual provider authentication needed
    console.log('✅ EMAIL PROCESSOR DEBUG - Admin email system ready:', {
      country: caseData.country,
      provider: adminCredentials.provider,
      authenticationMethod: 'centralized_admin_account'
    });

    // Get all users to determine who should receive notifications
    const allUsers = await getAllSupabaseUsers();
    const recipients: string[] = [];

    console.log('📧 EMAIL DEBUG - Notification rule details:', {
      status: newStatus,
      country: caseData.country,
      recipients: notificationRule.recipients,
      totalUsers: allUsers.length,
      enabledUsers: allUsers.filter(u => u.enabled).length,
      membersConfigured: notificationRule.recipients.members?.length || 0,
      rolesConfigured: notificationRule.recipients.roles?.length || 0
    });

    // Filter users based on notification rules from database
    for (const user of allUsers) {
      if (!user.email || !user.enabled) {
        continue; // Skip users without email or disabled users
      }

      // Check if user has access to this country
      if (!user.countries.includes(caseData.country)) {
        continue; // Skip users not in this country
      }

      let shouldIncludeUser = false;

      // Check if user is explicitly listed in members (highest priority)
      if (notificationRule.recipients.members && 
          notificationRule.recipients.members.includes(user.email)) {
        shouldIncludeUser = true;
        console.log(`📧 EMAIL DEBUG - User ${user.email} explicitly included in members list`);
      }
      
      // Also check role-based inclusion (members can be included by role too, non-members checked for roles)
      if (!shouldIncludeUser) {
        // Check department filter first
        let departmentPassed = true;
        if (notificationRule.recipients.departments && 
            !notificationRule.recipients.departments.includes('all') && 
            notificationRule.recipients.departments.length > 0) {
          departmentPassed = notificationRule.recipients.departments.some((dept: string) => user.departments.includes(dept));
        }

        // Only check roles if department filter passed
        if (departmentPassed && notificationRule.recipients.roles && notificationRule.recipients.roles.length > 0) {
          if (notificationRule.recipients.roles.includes(user.role)) {
            shouldIncludeUser = true;
            console.log(`📧 EMAIL DEBUG - User ${user.email} included by role: ${user.role}`);
          }
        }
      }

      if (shouldIncludeUser) {
        recipients.push(user.email);
        console.log(`📧 EMAIL DEBUG - Added recipient: ${user.email} (${user.name})`);
      }
    }

    // Add case submitter if includeSubmitter is enabled
    if (notificationRule.recipients.includeSubmitter && caseData.submittedBy) {
      const submitterUser = allUsers.find(user => user.id === caseData.submittedBy);
      if (submitterUser && submitterUser.email) {
        recipients.push(submitterUser.email);
      } else {
        console.log(`⚠️ Could not find email for submitter ID: ${caseData.submittedBy}`);
      }
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];

    console.log('📧 EMAIL DEBUG - Final recipient analysis:', {
      beforeDeduplication: recipients.length,
      afterDeduplication: uniqueRecipients.length,
      recipients: uniqueRecipients,
      expectedMembers: notificationRule.recipients.members || [],
      jadeIncluded: uniqueRecipients.includes('jade.long@transmedicgroup.com'),
      sereneIncluded: uniqueRecipients.includes('serene.lim@transmedicgroup.com'),
      notificationRuleMembers: notificationRule.recipients.members,
      caseDetails: {
        caseRef: caseData.caseReferenceNumber,
        status: newStatus,
        country: caseData.country
      }
    });

    if (uniqueRecipients.length === 0) {
      console.log(`❌ EMAIL DEBUG - No valid recipients found for case ${caseData.caseReferenceNumber}`);
      return;
    }

    console.log(`✅ EMAIL DEBUG - Found ${uniqueRecipients.length} recipients for ${newStatus} notification:`, uniqueRecipients);

    // Create email content using template from notification rule
    console.log('🔍 TEMPLATE DEBUG - Database template content:', {
      status: newStatus,
      subjectTemplate: notificationRule.template.subject,
      bodyTemplate: notificationRule.template.body?.substring(0, 200) + '...',
      templateSource: 'database_notification_rules'
    });
    
    const subject = await replaceTemplateVariables(notificationRule.template.subject, caseData, changedBy);
    const body = await replaceTemplateVariables(notificationRule.template.body, caseData, changedBy);
    
    console.log('🔍 TEMPLATE DEBUG - Final template after variable replacement:', {
      status: newStatus,
      finalSubject: subject,
      finalBodyPreview: body?.substring(0, 300) + '...',
      bodyLength: body?.length
    });

    // CRITICAL FIX: Send email via centralized admin service
    console.log('🔍 E2E DEBUG - Admin email notification attempt:', {
      country: caseData.country,
      recipientCount: uniqueRecipients.length,
      recipients: uniqueRecipients,
      subject,
      caseRef: caseData.caseReferenceNumber,
      adminProvider: adminCredentials.provider,
      adminFromEmail: adminCredentials.fromEmail,
      adminFromName: adminCredentials.fromName
    });

    const emailResult = await centralizedEmailService.sendEmail(caseData.country, {
      to: uniqueRecipients,
      subject,
      body,
      replyTo: adminCredentials.fromEmail // Optional: Allow replies to admin email
    });

    console.log('🔍 E2E DEBUG - Admin Email Service Response:', {
      country: caseData.country,
      caseRef: caseData.caseReferenceNumber,
      success: emailResult.success,
      error: emailResult.error,
      recipientCount: uniqueRecipients.length,
      authenticationMethod: 'centralized_admin'
    });

    if (emailResult.success) {
      console.log(`📧 Admin email notification sent successfully to ${uniqueRecipients.length} recipients for case ${caseData.caseReferenceNumber}`);
    } else {
      console.error(`📧 Failed to send admin email notification for case ${caseData.caseReferenceNumber}:`, {
        error: emailResult.error,
        country: caseData.country,
        adminProvider: adminCredentials.provider,
        recipients: uniqueRecipients
      });
    }

  } catch (error) {
    console.error('Error processing email notifications:', error);
  }
};

/**
 * Create email body content
 */
const createEmailBody = (
  caseData: CaseBooking,
  newStatus: CaseStatus,
  oldStatus?: CaseStatus,
  changedBy?: string
): string => {
  return `
<html>
<body style="font-family: Arial, sans-serif; color: #333;">
  <h2>Case Status Update Notification</h2>
  
  <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3>Case Information</h3>
    <p><strong>Case Reference:</strong> ${caseData.caseReferenceNumber}</p>
    <p><strong>Hospital:</strong> ${caseData.hospital}</p>
    <p><strong>Department:</strong> ${caseData.department}</p>
    <p><strong>Doctor:</strong> ${caseData.doctorName || 'Not specified'}</p>
    <p><strong>Procedure:</strong> ${caseData.procedureType} - ${caseData.procedureName}</p>
    <p><strong>Surgery Date:</strong> ${caseData.dateOfSurgery}</p>
    ${caseData.timeOfProcedure ? `<p><strong>Surgery Time:</strong> ${caseData.timeOfProcedure}</p>` : ''}
  </div>

  <div style="background-color: #e8f4fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h3>Status Update</h3>
    ${oldStatus ? `<p><strong>Previous Status:</strong> ${oldStatus}</p>` : ''}
    <p><strong>New Status:</strong> <span style="color: #0066cc; font-weight: bold;">${newStatus}</span></p>
    ${changedBy ? `<p><strong>Updated By:</strong> ${changedBy}</p>` : ''}
    <p><strong>Updated At:</strong> ${new Date().toLocaleString()}</p>
  </div>

  ${caseData.surgerySetSelection && caseData.surgerySetSelection.length > 0 ? `
  <div style="margin: 15px 0;">
    <h4>Surgery Sets:</h4>
    <ul>
      ${caseData.surgerySetSelection.map(set => `<li>${set}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${caseData.implantBox && caseData.implantBox.length > 0 ? `
  <div style="margin: 15px 0;">
    <h4>Implant Boxes:</h4>
    <ul>
      ${caseData.implantBox.map(implant => `<li>${implant}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${caseData.specialInstruction ? `
  <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
    <h4>Special Instructions:</h4>
    <p>${caseData.specialInstruction}</p>
  </div>
  ` : ''}

  <hr style="margin: 20px 0;">
  <p style="font-size: 12px; color: #666;">
    This is an automated notification from the Case Booking System. 
    Please log in to the system for more details and to take any required actions.
  </p>
</body>
</html>
  `.trim();
};

/**
 * Replace template variables with actual case data
 */
const replaceTemplateVariables = async (
  template: string,
  caseData: CaseBooking,
  changedBy?: string
): Promise<string> => {
  // Format surgery set selection and implant box arrays
  const formatArray = (arr: string[] | undefined) => arr?.length ? arr.join(', ') : 'None selected';
  
  // Get user information asynchronously
  const submitterName = await getSubmitterName(caseData.submittedBy);
  const currentUserInfo = await getCurrentUserInfo(changedBy);
  
  return template
    // Basic Case Information
    .replace(/\{\{caseReference\}\}/g, caseData.caseReferenceNumber)
    .replace(/\{\{caseReferenceNumber\}\}/g, caseData.caseReferenceNumber)
    .replace(/\{\{hospital\}\}/g, caseData.hospital)
    .replace(/\{\{department\}\}/g, caseData.department)
    .replace(/\{\{country\}\}/g, caseData.country)
    .replace(/\{\{Status\}\}/g, caseData.status) // Capitalized Status
    .replace(/\{\{status\}\}/g, caseData.status.toLowerCase()) // Lowercase status
    // MRN and patient info not available in case booking data
    .replace(/\{\{mrn\}\}/g, 'Not specified')
    .replace(/\{\{patientName\}\}/g, 'Not specified')
    
    // Surgery Details
    .replace(/\{\{dateOfSurgery\}\}/g, caseData.dateOfSurgery)
    .replace(/\{\{timeOfProcedure\}\}/g, caseData.timeOfProcedure || 'Not specified')
    .replace(/\{\{procedureType\}\}/g, caseData.procedureType)
    .replace(/\{\{procedureName\}\}/g, caseData.procedureName)
    .replace(/\{\{doctorName\}\}/g, caseData.doctorName || 'Not specified')
    .replace(/\{\{surgerySetSelection\}\}/g, formatArray(caseData.surgerySetSelection))
    .replace(/\{\{surgeryImplants\}\}/g, formatArray(caseData.implantBox))
    .replace(/\{\{implantBox\}\}/g, formatArray(caseData.implantBox))
    
    // User & Timestamps
    .replace(/\{\{submittedBy\}\}/g, submitterName || caseData.submittedBy)
    .replace(/\{\{submittedAt\}\}/g, formatTimestamp(caseData.submittedAt))
    .replace(/\{\{processedBy\}\}/g, currentUserInfo.name || changedBy || 'System')
    .replace(/\{\{processedAt\}\}/g, new Date().toLocaleString())
    .replace(/\{\{currentDateTime\}\}/g, new Date().toLocaleString())
    .replace(/\{\{userEmail\}\}/g, currentUserInfo.email || 'Not available')
    .replace(/\{\{userName\}\}/g, currentUserInfo.name || changedBy || 'System')
    
    // Additional Information
    .replace(/\{\{specialInstruction\}\}/g, caseData.specialInstruction || 'None')
    .replace(/\{\{specialInstructions\}\}/g, caseData.specialInstruction || 'None') // Plural form
    .replace(/\{\{remarks\}\}/g, caseData.specialInstruction || 'None') // Use specialInstruction since remarks field doesn't exist
    .replace(/\{\{salesOrderNo\}\}/g, 'Not specified') // Field doesn't exist in CaseBooking
    .replace(/\{\{poNo\}\}/g, 'Not specified') // Field doesn't exist in CaseBooking
    .replace(/\{\{deliveryAddress\}\}/g, 'Not specified') // Field doesn't exist in CaseBooking
    .replace(/\{\{contactPerson\}\}/g, 'Not specified') // Field doesn't exist in CaseBooking
    .replace(/\{\{contactNumber\}\}/g, 'Not specified') // Field doesn't exist in CaseBooking
    .replace(/\n/g, '<br>'); // Convert line breaks to HTML breaks
};

/**
 * Get submitter name from user ID
 */
const getSubmitterName = async (submitterId?: string): Promise<string | null> => {
  if (!submitterId) return null;
  
  try {
    // Import supabase here to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    const { data: user, error } = await supabase
      .from('profiles')
      .select('name, username')
      .eq('id', submitterId)
      .single();
    
    if (error) {
      console.log('📧 EMAIL DEBUG - Could not fetch user name:', error.message);
      return submitterId; // Fallback to ID
    }
    
    return user?.name || user?.username || submitterId;
  } catch (error) {
    console.log('📧 EMAIL DEBUG - Error fetching user name:', error);
    return submitterId; // Fallback to ID
  }
};

/**
 * Get current user info from user ID or name
 */
const getCurrentUserInfo = async (userIdOrName?: string): Promise<{ name: string | null; email: string | null }> => {
  if (!userIdOrName) return { name: null, email: null };
  
  try {
    // Import supabase here to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    // First try to find by ID
    let query = supabase
      .from('profiles')
      .select('name, username, email')
      .or(`id.eq.${userIdOrName},username.eq.${userIdOrName},name.eq.${userIdOrName}`)
      .limit(1)
      .single();
    
    const { data: user, error } = await query;
    
    if (error) {
      console.log('📧 EMAIL DEBUG - Could not fetch current user info:', error.message);
      return { name: userIdOrName, email: null };
    }
    
    return {
      name: user?.name || user?.username || userIdOrName,
      email: user?.email || null
    };
  } catch (error) {
    console.log('📧 EMAIL DEBUG - Error fetching current user info:', error);
    return { name: userIdOrName, email: null };
  }
};

/**
 * Format timestamp for display
 */
const formatTimestamp = (timestamp: string): string => {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
};