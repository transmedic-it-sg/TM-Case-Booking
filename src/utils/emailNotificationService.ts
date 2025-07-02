// Email Notification Service - Connects email config to case workflow
import { CaseBooking } from '../types';
import { getUsers } from './auth';

export interface EmailNotificationRule {
  status: string;
  enabled: boolean;
  recipients: {
    roles: string[];
    specificEmails: string[];
    includeSubmitter: boolean;
    departmentFilter: string[];
    requireSameDepartment: boolean;
  };
  template: {
    subject: string;
    body: string;
  };
}

export interface EmailNotificationMatrix {
  country: string;
  rules: EmailNotificationRule[];
}

// Get email configuration for a country
export const getEmailConfig = (country: string) => {
  const stored = localStorage.getItem('simplified_email_configs');
  if (!stored) return null;
  
  try {
    const configs = JSON.parse(stored);
    return configs[country] || null;
  } catch (error) {
    console.error('Failed to parse email configs:', error);
    return null;
  }
};

// Get notification matrix for a country
export const getNotificationMatrix = (country: string): EmailNotificationMatrix | null => {
  const stored = localStorage.getItem('email-matrix-configs-by-country');
  if (!stored) return null;
  
  try {
    const matrixConfigs = JSON.parse(stored);
    return matrixConfigs[country] || null;
  } catch (error) {
    console.error('Failed to parse notification matrix configs:', error);
    return null;
  }
};

// Get OAuth tokens for active provider
export const getActiveProviderTokens = (country: string) => {
  const config = getEmailConfig(country);
  if (!config || !config.activeProvider) return null;
  
  const provider = config.providers[config.activeProvider];
  if (!provider || !provider.isAuthenticated || !provider.tokens) return null;
  
  return {
    provider: config.activeProvider,
    tokens: provider.tokens,
    userInfo: provider.userInfo
  };
};

// Apply template variables to text
export const applyTemplateVariables = (template: string, caseData: CaseBooking, additionalVars: Record<string, string> = {}): string => {
  let result = template;
  
  console.log('🔄 Applying template variables to:', template.substring(0, 100) + '...');
  console.log('📋 Case data:', {
    caseReference: caseData.caseReferenceNumber,
    hospital: caseData.hospital,
    submittedBy: caseData.submittedBy,
    dateOfSurgery: caseData.dateOfSurgery
  });
  
  // Case-specific variables
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
    surgerySetSelection: Array.isArray(caseData.surgerySetSelection) ? caseData.surgerySetSelection.join(', ') : 'N/A',
    implantBox: Array.isArray(caseData.implantBox) ? caseData.implantBox.join(', ') : 'N/A',
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
export const getRecipientEmails = (
  recipients: EmailNotificationRule['recipients'], 
  caseData: CaseBooking
): string[] => {
  const users = getUsers();
  const recipientEmails: string[] = [];
  
  // Add role-based recipients
  users.forEach(user => {
    // Check if user has matching role
    if (recipients.roles.includes(user.role)) {
      // Check if user has access to the case's country
      if (user.countries && user.countries.includes(caseData.country)) {
        // Check department filter if specified
        if (recipients.departmentFilter.length > 0) {
          // User must have access to at least one specified department
          const hasMatchingDepartment = recipients.departmentFilter.some(dept => 
            user.departments && user.departments.includes(dept)
          );
          if (!hasMatchingDepartment) return;
        }
        
        // Check same department requirement
        if (recipients.requireSameDepartment && user.departments) {
          if (!user.departments.includes(caseData.department)) return;
        }
        
        if (user.email) {
          recipientEmails.push(user.email);
        }
      }
      // Include admin users regardless of country
      else if (user.role === 'admin' && user.email) {
        if (recipients.departmentFilter.length === 0 || 
            (user.departments && recipients.departmentFilter.some(dept => user.departments!.includes(dept)))) {
          recipientEmails.push(user.email);
        }
      }
    }
  });
  
  // Add specific email addresses
  if (recipients.specificEmails) {
    recipientEmails.push(...recipients.specificEmails);
  }
  
  // Add submitter if requested
  if (recipients.includeSubmitter && caseData.submittedBy) {
    // Find submitter's email
    const submitter = users.find(user => user.name === caseData.submittedBy);
    if (submitter && submitter.email) {
      recipientEmails.push(submitter.email);
    }
  }
  
  return Array.from(new Set(recipientEmails)); // Remove duplicates
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

    // Get notification matrix for the case's country
    const notificationMatrix = getNotificationMatrix(caseData.country);
    if (!notificationMatrix) {
      console.warn('⚠️ No email notification matrix found for country:', caseData.country);
      return false;
    }

    // Find the notification rule for this status
    const statusRule = notificationMatrix.rules.find(rule => rule.status === newStatus);
    if (!statusRule || !statusRule.enabled) {
      console.log('📵 Email notifications disabled for status:', newStatus);
      return false;
    }

    // Get OAuth tokens for active provider
    const authData = getActiveProviderTokens(caseData.country);
    if (!authData) {
      console.warn('🔐 No authenticated email provider found for country:', caseData.country);
      return false;
    }

    // Get recipient email addresses
    const recipientEmails = getRecipientEmails(statusRule.recipients, caseData);
    if (recipientEmails.length === 0) {
      console.warn('📭 No recipient emails found for rules:', statusRule.recipients);
      return false;
    }

    // Apply template variables
    const subject = applyTemplateVariables(statusRule.template.subject, caseData, additionalInfo);
    const body = applyTemplateVariables(statusRule.template.body, caseData, additionalInfo);

    // Import OAuth service dynamically to avoid circular dependencies
    const { createOAuthManager } = await import('./simplifiedOAuth');
    const oauthService = createOAuthManager(authData.provider as 'google' | 'microsoft');

    // Send email
    const emailSent = await oauthService.sendEmail(authData.tokens.accessToken, {
      to: recipientEmails,
      subject: subject,
      body: body,
      from: authData.userInfo?.name || 'Case Booking System'
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