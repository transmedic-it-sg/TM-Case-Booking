/**
 * Email Service - Production email sending via Supabase Edge Function
 */

import { supabase } from '../lib/supabase';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';

export interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  fromName?: string;
}

class EmailService {
  /**
   * Send email via Supabase Edge Function
   */
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData
      });

      if (error) {
        console.error('Edge function error:', error);
        return { 
          success: false, 
          error: error.message || 'Failed to send email' 
        };
      }

      if (data && data.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data?.error || 'Unknown error occurred' 
        };
      }
    } catch (error) {
      console.error('Email send error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send email' 
      };
    }
  }

  /**
   * Send case notification email
   */
  async sendCaseNotification(
    caseData: {
      caseNumber: string;
      status: string;
      hospital: string;
      department: string;
      procedureType?: string;
      doctorName?: string;
      surgeryDate?: string;
      updatedBy?: string;
      notes?: string;
    },
    recipients: string[],
    cc?: string[],
    template?: 'new_case' | 'status_update' | 'reminder'
  ): Promise<{ success: boolean; error?: string }> {
    // Prepare email body based on template
    let subject = '';
    let body = '';

    switch (template) {
      case 'new_case':
        subject = `New Case Booked - ${caseData.caseNumber}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5aa0;">New Case Booked</h2>
            <p>A new case has been booked in the TM Case Booking System:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Case Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.caseNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Hospital:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.hospital}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Department:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.department}</td>
              </tr>
              ${caseData.surgeryDate ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Surgery Date:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.surgeryDate}</td>
              </tr>` : ''}
              ${caseData.procedureType ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Procedure:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.procedureType}</td>
              </tr>` : ''}
              ${caseData.doctorName ? `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Doctor:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.doctorName}</td>
              </tr>` : ''}
            </table>
            
            <p style="margin-top: 20px;">Please proceed with order preparation.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification from the TM Case Booking System.<br>
              For assistance, please contact your system administrator.
            </p>
          </div>
        `;
        break;

      case 'status_update':
        subject = `Case ${caseData.caseNumber} - Status Updated to ${caseData.status}`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5aa0;">Case Status Updated</h2>
            <p>The status of case ${caseData.caseNumber} has been updated:</p>
            
            <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>New Status:</strong> ${caseData.status}</p>
              ${caseData.updatedBy ? `<p style="margin: 5px 0;"><strong>Updated By:</strong> ${caseData.updatedBy}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Hospital:</strong> ${caseData.hospital}</p>
              <p style="margin: 5px 0;"><strong>Department:</strong> ${caseData.department}</p>
            </div>
            
            ${caseData.notes ? `
            <div style="margin: 20px 0;">
              <strong>Notes:</strong>
              <p style="background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${caseData.notes}</p>
            </div>` : ''}
            
            <p>Please take appropriate action if required.</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification from the TM Case Booking System.<br>
              For assistance, please contact your system administrator.
            </p>
          </div>
        `;
        break;

      default:
        subject = `Case ${caseData.caseNumber} - Notification`;
        body = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2c5aa0;">Case Notification</h2>
            <p>This is a notification regarding case ${caseData.caseNumber}</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Case Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.caseNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Status:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.status}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Hospital:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.hospital}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Department:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #ddd;">${caseData.department}</td>
              </tr>
            </table>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              This is an automated notification from the TM Case Booking System.<br>
              For assistance, please contact your system administrator.
            </p>
          </div>
        `;
    }

    return this.sendEmail({
      to: recipients,
      cc,
      subject,
      body,
      fromName: 'TM Case Booking System'
    });
  }
}

export const emailService = new EmailService();
export default emailService;