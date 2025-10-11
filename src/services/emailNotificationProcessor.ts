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
  try {
    // Get email configuration for the case's country
    const emailConfigs = await getEmailConfigFromDatabase(caseData.country);
    const countryConfig = emailConfigs[caseData.country];
    
    if (!countryConfig) {
      console.log(`No email configuration found for country: ${caseData.country}`);
      return;
    }

    // Get notification rule from email_notification_rules table
    const { supabase } = await import('../lib/supabase');
    const { data: notificationRule, error } = await supabase
      .from('email_notification_rules')
      .select('*')
      .eq('country', caseData.country)
      .eq('status', newStatus)
      .eq('enabled', true)
      .single();

    if (error || !notificationRule) {
      console.log(`No notification rule enabled for status: ${newStatus} in ${caseData.country}`, error);
      return;
    }

    // Get active email provider for this country
    const activeProvider = countryConfig.providers.microsoft.isAuthenticated ? 'microsoft' :
                          countryConfig.providers.google.isAuthenticated ? 'google' : null;
                          
    if (!activeProvider) {
      console.log(`No authenticated email provider for country: ${caseData.country}`);
      return;
    }

    // Email will be sent via Supabase Edge Function using service principal authentication

    // Get all users to determine who should receive notifications
    const allUsers = await getAllSupabaseUsers();
    const recipients: string[] = [];

    // Filter users based on notification rules from database
    for (const user of allUsers) {
      if (!user.email || !user.enabled) {
        continue; // Skip users without email or disabled users
      }

      // Check if user has access to this country
      if (!user.countries.includes(caseData.country)) {
        continue; // Skip users not in this country
      }

      // Check department filter
      if (notificationRule.recipients.departments && 
          !notificationRule.recipients.departments.includes('all') && 
          notificationRule.recipients.departments.length > 0) {
        if (!notificationRule.recipients.departments.some((dept: string) => user.departments.includes(dept))) {
          continue;
        }
      }

      // Check role filter
      if (notificationRule.recipients.roles && notificationRule.recipients.roles.length > 0) {
        if (!notificationRule.recipients.roles.includes(user.role)) {
          continue;
        }
      }

      // Check specific members filter
      if (notificationRule.recipients.members && notificationRule.recipients.members.length > 0) {
        if (!notificationRule.recipients.members.includes(user.email)) {
          continue;
        }
      }

      // Add user email to recipients
      recipients.push(user.email);
    }

    // Add case submitter if includeSubmitter is enabled
    if (notificationRule.recipients.includeSubmitter && caseData.submittedBy) {
      recipients.push(caseData.submittedBy);
    }

    // Remove duplicates
    const uniqueRecipients = [...new Set(recipients)];

    if (uniqueRecipients.length === 0) {
      console.log(`No valid recipients found for case ${caseData.caseReferenceNumber}`);
      return;
    }

    console.log(`Found ${uniqueRecipients.length} recipients for ${newStatus} notification:`, uniqueRecipients);

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
        enabled: countryConfig?.providers?.[activeProvider]?.enabled,
        isAuthenticated: countryConfig?.providers?.[activeProvider]?.isAuthenticated
      }
    });

    const emailPayload = {
      to: uniqueRecipients,
      subject,
      body,
      fromName: countryConfig.providers[activeProvider].fromName || 'TM Case Booking System'
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
  return template
    .replace(/\{\{caseReferenceNumber\}\}/g, caseData.caseReferenceNumber)
    .replace(/\{\{hospital\}\}/g, caseData.hospital)
    .replace(/\{\{department\}\}/g, caseData.department)
    .replace(/\{\{doctorName\}\}/g, caseData.doctorName || 'Not specified')
    .replace(/\{\{dateOfSurgery\}\}/g, caseData.dateOfSurgery)
    .replace(/\{\{procedureType\}\}/g, caseData.procedureType)
    .replace(/\{\{procedureName\}\}/g, caseData.procedureName)
    .replace(/\{\{status\}\}/g, caseData.status)
    .replace(/\{\{processedBy\}\}/g, changedBy || 'System')
    .replace(/\{\{processedAt\}\}/g, new Date().toLocaleString())
    .replace(/\{\{submittedBy\}\}/g, caseData.submittedBy);
};