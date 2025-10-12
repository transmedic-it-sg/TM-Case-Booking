/**
 * Email Notification Processor - Connects Email Configuration with Case Updates
 * Processes notification rules and sends emails when cases change status
 */

import { CaseBooking, CaseStatus } from '../types';
import { getAllSupabaseUsers } from '../utils/supabaseUserService';
import { getEmailConfigFromDatabase } from '../components/SimplifiedEmailConfig';
// Email sent via Supabase Edge Function - OAuth imports removed
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
    // Get email configuration for the case's country
    console.log('📧 EMAIL PROCESSOR DEBUG - Fetching email config:', {
      country: caseData.country,
      functionName: getEmailConfigFromDatabase.name
    });

    const emailConfigs = await getEmailConfigFromDatabase(caseData.country);
    
    console.log('📧 EMAIL PROCESSOR DEBUG - Email config retrieved:', {
      country: caseData.country,
      hasEmailConfigs: !!emailConfigs,
      configKeys: emailConfigs ? Object.keys(emailConfigs) : [],
      emailConfigsType: typeof emailConfigs,
      emailConfigsLength: emailConfigs ? Object.keys(emailConfigs).length : 0
    });

    const countryConfig = emailConfigs[caseData.country];
    
    console.log('📧 EMAIL PROCESSOR DEBUG - Country config check:', {
      country: caseData.country,
      hasCountryConfig: !!countryConfig,
      countryConfigKeys: countryConfig ? Object.keys(countryConfig) : [],
      providersAvailable: countryConfig?.providers ? Object.keys(countryConfig.providers) : []
    });
    
    if (!countryConfig) {
      console.log('❌ EMAIL PROCESSOR DEBUG - No email configuration found:', {
        country: caseData.country,
        availableCountries: emailConfigs ? Object.keys(emailConfigs) : [],
        emailConfigsStructure: emailConfigs
      });
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

    // Get active email provider for this country (Microsoft-only)
    const activeProvider = countryConfig.providers.microsoft.isAuthenticated ? 'microsoft' : null;
                          
    if (!activeProvider) {
      console.log(`Microsoft email provider not authenticated for country: ${caseData.country}`);
      return;
    }

    // Email will be sent via Supabase Edge Function using service principal authentication

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
      } else {
        // Check department filter for role-based users
        if (notificationRule.recipients.departments && 
            !notificationRule.recipients.departments.includes('all') && 
            notificationRule.recipients.departments.length > 0) {
          if (!notificationRule.recipients.departments.some((dept: string) => user.departments.includes(dept))) {
            continue;
          }
        }

        // Check role filter for role-based users
        if (notificationRule.recipients.roles && notificationRule.recipients.roles.length > 0) {
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
    const subject = replaceTemplateVariables(notificationRule.template.subject, caseData, changedBy);
    const body = replaceTemplateVariables(notificationRule.template.body, caseData, changedBy);

    // Send email notification via Supabase Edge Function (not direct OAuth)
    console.log('🔍 E2E DEBUG - Email notification attempt:', {
      activeProvider,
      recipientCount: uniqueRecipients.length,
      recipients: uniqueRecipients,
      subject,
      countryConfig: countryConfig?.providers?.[activeProvider],
      caseRef: caseData.caseReferenceNumber,
      emailConfig: {
        isAuthenticated: countryConfig?.providers?.[activeProvider]?.isAuthenticated
      }
    });

    // Get authentication tokens for the active provider
    const authTokens = countryConfig.providers[activeProvider]?.tokens;
    const userInfo = countryConfig.providers[activeProvider]?.userInfo;

    console.log('🔍 E2E DEBUG - Auth tokens check:', {
      activeProvider,
      hasTokens: !!authTokens,
      hasAccessToken: !!authTokens?.accessToken,
      hasUserInfo: !!userInfo,
      userEmail: userInfo?.email,
      tokenExpiry: authTokens?.expiresAt,
      isExpired: authTokens?.expiresAt ? Date.now() > authTokens.expiresAt : 'unknown'
    });

    const emailPayload = {
      to: uniqueRecipients,
      subject,
      body,
      fromName: countryConfig.providers[activeProvider].fromName || 'TM Case Booking System',
      // Include authentication tokens for Edge Function
      authTokens: authTokens,
      userInfo: userInfo,
      provider: activeProvider
    };

    console.log('🔍 E2E DEBUG - Email payload:', JSON.stringify(emailPayload, null, 2));

    const { data, error: emailError } = await supabase.functions.invoke('send-email', {
      body: emailPayload
    });

    console.log('🔍 E2E DEBUG - Email Edge Function Response:', {
      data,
      error: emailError,
      success: data?.success,
      errorMessage: data?.error || emailError?.message,
      fullError: emailError
    });

    const success = data?.success && !emailError;

    if (success) {
      console.log(`📧 Email notification sent successfully to ${uniqueRecipients.length} recipients for case ${caseData.caseReferenceNumber}`);
    } else {
      console.error(`📧 Failed to send email notification for case ${caseData.caseReferenceNumber}:`, {
        edgeFunctionData: data,
        edgeFunctionError: emailError,
        activeProvider,
        providerConfig: countryConfig?.providers?.[activeProvider]
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
const replaceTemplateVariables = (
  template: string,
  caseData: CaseBooking,
  changedBy?: string
): string => {
  // Format surgery set selection and implant box arrays
  const formatArray = (arr: string[] | undefined) => arr?.length ? arr.join(', ') : 'None selected';
  
  return template
    .replace(/\{\{caseReference\}\}/g, caseData.caseReferenceNumber)
    .replace(/\{\{caseReferenceNumber\}\}/g, caseData.caseReferenceNumber)
    .replace(/\{\{hospital\}\}/g, caseData.hospital)
    .replace(/\{\{department\}\}/g, caseData.department)
    .replace(/\{\{doctorName\}\}/g, caseData.doctorName || 'Not specified')
    .replace(/\{\{dateOfSurgery\}\}/g, caseData.dateOfSurgery)
    .replace(/\{\{timeOfProcedure\}\}/g, caseData.timeOfProcedure || 'Not specified')
    .replace(/\{\{procedureType\}\}/g, caseData.procedureType)
    .replace(/\{\{procedureName\}\}/g, caseData.procedureName)
    .replace(/\{\{surgerySetSelection\}\}/g, formatArray(caseData.surgerySetSelection))
    .replace(/\{\{implantBox\}\}/g, formatArray(caseData.implantBox))
    .replace(/\{\{specialInstruction\}\}/g, caseData.specialInstruction || 'None')
    .replace(/\{\{status\}\}/g, caseData.status)
    .replace(/\{\{submittedBy\}\}/g, getSubmitterName(caseData.submittedBy) || caseData.submittedBy)
    .replace(/\{\{submittedAt\}\}/g, formatTimestamp(caseData.submittedAt))
    .replace(/\{\{country\}\}/g, caseData.country)
    .replace(/\{\{processedBy\}\}/g, changedBy || 'System')
    .replace(/\{\{processedAt\}\}/g, new Date().toLocaleString());
};

/**
 * Get submitter name from user ID
 */
const getSubmitterName = (submitterId?: string): string | null => {
  // This would need to be enhanced to fetch actual user name
  // For now, return the ID
  return submitterId || null;
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