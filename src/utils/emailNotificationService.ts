/**
 * Email Notification Service - Basic email notification management
 * Provides email notification functionality with template support
 */

export interface EmailTemplate {
  subject: string;
  body: string;
  variables: Record<string, string>;
}

export interface EmailNotification {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  type: 'case_update' | 'status_change' | 'system_alert' | 'reminder';
}

class EmailNotificationService {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Case status update template
    this.templates.set('case_status_update', {
      subject: 'Case {{caseNumber}} - Status Updated to {{status}}',
      body: `
        Dear Team,

        Case {{caseNumber}} has been updated:

        Previous Status: {{previousStatus}}
        New Status: {{status}}
        Updated By: {{updatedBy}}
        Updated At: {{updatedAt}}

        Hospital: {{hospital}}
        Department: {{department}}
        Procedure: {{procedureType}}

        {{#if notes}}
        Notes: {{notes}}
        {{/if}}

        Please take appropriate action if required.

        Best regards,
        Case Management System
      `,
      variables: {
        caseNumber: '',
        status: '',
        previousStatus: '',
        updatedBy: '',
        updatedAt: '',
        hospital: '',
        department: '',
        procedureType: '',
        notes: ''
      }
    });

    // New case booked template
    this.templates.set('new_case_booked', {
      subject: 'New Case Booked - {{caseNumber}}',
      body: `
        Dear Team,

        A new case has been booked:

        Case Number: {{caseNumber}}
        Hospital: {{hospital}}
        Department: {{department}}
        Surgery Date: {{surgeryDate}}
        Procedure: {{procedureType}} - {{procedureName}}
        Doctor: {{doctorName}}

        Submitted By: {{submittedBy}}
        Submitted At: {{submittedAt}}

        Please proceed with order preparation.

        Best regards,
        Case Management System
      `,
      variables: {
        caseNumber: '',
        hospital: '',
        department: '',
        surgeryDate: '',
        procedureType: '',
        procedureName: '',
        doctorName: '',
        submittedBy: '',
        submittedAt: ''
      }
    });
  }

  getTemplate(templateName: string): EmailTemplate | null {
    return this.templates.get(templateName) || null;
  }

  setTemplate(templateName: string, template: EmailTemplate): void {
    this.templates.set(templateName, template);
  }

  renderTemplate(templateName: string, variables: Record<string, string>): EmailNotification | null {
    const template = this.getTemplate(templateName);
    if (!template) {
      return null;
    }

    let subject = template.subject;
    let body = template.body;

    // Replace variables in template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value || '');
      body = body.replace(regex, value || '');
    });

    // Handle conditional blocks (basic implementation)
    body = body.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
      return variables[condition] ? content : '';
    });

    return {
      to: [], // To be filled by caller
      subject: subject.trim(),
      body: body.trim(),
      type: this.getEmailType(templateName)
    };
  }

  private getEmailType(templateName: string): EmailNotification['type'] {
    if (templateName.includes('status')) return 'status_change';
    if (templateName.includes('case')) return 'case_update';
    if (templateName.includes('alert')) return 'system_alert';
    return 'case_update';
  }

  async sendNotification(notification: EmailNotification): Promise<boolean> {
    try {
      // This would integrate with actual email service (SendGrid, AWS SES, etc.)// Simulate success
      return true;
    } catch (error) {
      return false;
    }
  }

  validateEmailAddresses(emails: string[]): { valid: string[]; invalid: string[] } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid: string[] = [];
    const invalid: string[] = [];

    emails.forEach(email => {
      if (emailRegex.test(email.trim())) {
        valid.push(email.trim());
      } else {
        invalid.push(email);
      }
    });

    return { valid, invalid };
  }
}

// Export individual functions for backward compatibility
const service = new EmailNotificationService();

export const getNotificationMatrix = async (country?: string) => {
  // Mock implementation - would fetch from database
  return {
    rules: []
  };
};

export const getActiveProviderTokens = async (country?: string) => {
  // Mock implementation - would fetch active email provider tokens
  return {
    provider: 'mock',
    tokens: {},
    userInfo: {}
  };
};

export const areEmailNotificationsEnabled = async (country?: string) => {
  // Mock implementation - would check system settings
  return true;
};

export const getRecipientEmails = async (type: string, country: string, caseData?: any) => {
  // Mock implementation - would fetch recipient emails based on type and country
  return [];
};

export const applyTemplateVariables = (template: string, variables: Record<string, string>) => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  });
  return result;
};

export default service;