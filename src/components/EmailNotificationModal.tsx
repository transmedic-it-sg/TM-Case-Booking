import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import MultiSelectDropdown from './MultiSelectDropdown';

interface EmailNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rule: {
    status: string;
    enabled: boolean;
    subject?: string;
    body?: string;
    recipients?: {
      roles?: string[];
      members?: string[];
      specificEmails?: string[];
      departments?: string[];
      includeSubmitter?: boolean;
      useDepartmentFilter?: boolean;
    };
  };
  country: string;
  onSave: (updatedRule: any) => void;
}

const EmailNotificationModal: React.FC<EmailNotificationModalProps> = ({
  isOpen,
  onClose,
  rule,
  country,
  onSave
}) => {
  const [editedRule, setEditedRule] = useState(rule);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableMembers, setAvailableMembers] = useState<string[]>([]);
  const [availableDepartments, setAvailableDepartments] = useState<string[]>([]);
  const [specificEmailsText, setSpecificEmailsText] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadAvailableOptions();
      setEditedRule({
        ...rule,
        subject: rule.subject || getDefaultSubject(rule.status),
        body: rule.body || getDefaultBody(rule.status),
        recipients: {
          roles: rule.recipients?.roles || [],
          members: rule.recipients?.members || [],
          specificEmails: rule.recipients?.specificEmails || [],
          departments: rule.recipients?.departments || [],
          includeSubmitter: rule.recipients?.includeSubmitter || false,
          useDepartmentFilter: rule.recipients?.useDepartmentFilter || false,
        }
      });
      setSpecificEmailsText((rule.recipients?.specificEmails || []).join(', '));
    }
  }, [isOpen, rule]);

  const loadAvailableOptions = async () => {
    try {
      // Load roles from permission system - no hardcoded data
      const { getAllRoles } = await import('../data/permissionMatrixData');
      const rolesData = getAllRoles();
      setAvailableRoles(rolesData.map(role => role.id));

      // Load users
      const { data: users } = await supabase
        .from('users')
        .select('name')
        .eq('country', country);
      if (users) {
        setAvailableMembers(users.map(u => u.name));
      }

      // Load departments from unified service - no hardcoded data
      const { getStandardizedDepartments } = await import('../utils/unifiedDataService');
      const departments = await getStandardizedDepartments(country);
      setAvailableDepartments(departments);
    } catch (error) {
      console.error('Error loading options:', error);
    }
  };

  const getDefaultSubject = (status: string) => {
    const subjects: { [key: string]: string } = {
      'Case Booked': 'New Case Booking: {{caseReference}} - {{hospital}}',
      'Pending': 'Case {{caseReference}} - Pending Review',
      'Confirmed': 'Case {{caseReference}} - Confirmed',
      'Cancelled': 'Case {{caseReference}} - Cancelled',
      'Completed': 'Case {{caseReference}} - Completed',
      'Request for More Info': 'Case {{caseReference}} - Additional Information Required'
    };
    return subjects[status] || `Case Status Update: ${status}`;
  };

  const getDefaultBody = (status: string) => {
    const bodies: { [key: string]: string } = {
      'Case Booked': `Dear Team,

A new case has been booked with the following details:

Case Reference: {{caseReference}}
Hospital: {{hospital}}
Patient: {{patientName}}
Date of Surgery: {{dateOfSurgery}}
Surgery Type: {{surgeryType}}
Surgeon: {{surgeon}}

Please review the case details in the system.

Best regards,
TM Case Booking System`,
      'Pending': `Dear Team,

Case {{caseReference}} is pending review.

Hospital: {{hospital}}
Patient: {{patientName}}
Date of Surgery: {{dateOfSurgery}}

Please review and confirm at your earliest convenience.

Best regards,
TM Case Booking System`,
      'Confirmed': `Dear Team,

Case {{caseReference}} has been confirmed.

Hospital: {{hospital}}
Patient: {{patientName}}
Date of Surgery: {{dateOfSurgery}}
Surgery Type: {{surgeryType}}

All arrangements have been confirmed.

Best regards,
TM Case Booking System`,
      'Cancelled': `Dear Team,

Case {{caseReference}} has been cancelled.

Hospital: {{hospital}}
Patient: {{patientName}}
Original Date: {{dateOfSurgery}}

Please take note of this cancellation.

Best regards,
TM Case Booking System`,
      'Completed': `Dear Team,

Case {{caseReference}} has been completed successfully.

Hospital: {{hospital}}
Patient: {{patientName}}
Date of Surgery: {{dateOfSurgery}}
Surgery Type: {{surgeryType}}

Thank you for your support.

Best regards,
TM Case Booking System`,
      'Request for More Info': `Dear Team,

Additional information is required for case {{caseReference}}.

Hospital: {{hospital}}
Patient: {{patientName}}
Date of Surgery: {{dateOfSurgery}}

Please provide the requested information to proceed.

Best regards,
TM Case Booking System`
    };
    return bodies[status] || `Case {{caseReference}} status has been updated to: ${status}`;
  };

  const handleSave = () => {
    const emails = specificEmailsText
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    const updatedRule = {
      ...editedRule,
      recipients: {
        ...editedRule.recipients,
        specificEmails: emails
      }
    };

    onSave(updatedRule);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0 }}>
            Configure Email Notification: {rule.status}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6c757d'
            }}
          >
            ×
          </button>
        </div>

        {/* Enable/Disable Toggle */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={editedRule.enabled}
              onChange={(e) => setEditedRule({ ...editedRule, enabled: e.target.checked })}
            />
            <span style={{ fontWeight: 600 }}>Enable notifications for {rule.status}</span>
          </label>
        </div>

        {editedRule.enabled && (
          <>
            {/* Email Subject */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Email Subject
              </label>
              <input
                type="text"
                value={editedRule.subject || ''}
                onChange={(e) => setEditedRule({ ...editedRule, subject: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px'
                }}
                placeholder="Enter email subject..."
              />
              <small style={{ color: '#6c757d' }}>
                Available placeholders: {`{{caseReference}}, {{hospital}}, {{patientName}}, {{dateOfSurgery}}`}
              </small>
            </div>

            {/* Email Body */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                Email Body
              </label>
              <textarea
                value={editedRule.body || ''}
                onChange={(e) => setEditedRule({ ...editedRule, body: e.target.value })}
                rows={10}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem'
                }}
                placeholder="Enter email body template..."
              />
              <small style={{ color: '#6c757d' }}>
                Available placeholders: {`{{caseReference}}, {{hospital}}, {{patientName}}, {{dateOfSurgery}}, {{surgeryType}}, {{surgeon}}`}
              </small>
            </div>

            {/* Recipients Configuration */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ marginTop: 0 }}>Recipients Configuration</h4>
              
              {/* Roles Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Send to Roles
                </label>
                <MultiSelectDropdown
                  id="notification-roles"
                  label=""
                  options={availableRoles}
                  value={editedRule.recipients?.roles || []}
                  onChange={(roles) => setEditedRule({
                    ...editedRule,
                    recipients: { ...editedRule.recipients, roles }
                  })}
                  placeholder="Select roles..."
                />
              </div>

              {/* Members Selection */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Send to Specific Members
                </label>
                <MultiSelectDropdown
                  id="notification-members"
                  label=""
                  options={availableMembers}
                  value={editedRule.recipients?.members || []}
                  onChange={(members) => setEditedRule({
                    ...editedRule,
                    recipients: { ...editedRule.recipients, members }
                  })}
                  placeholder="Select team members..."
                />
              </div>

              {/* Additional Email Addresses */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  Additional Email Addresses
                </label>
                <input
                  type="text"
                  value={specificEmailsText}
                  onChange={(e) => setSpecificEmailsText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ced4da',
                    borderRadius: '4px'
                  }}
                  placeholder="email1@example.com, email2@example.com"
                />
                <small style={{ color: '#6c757d' }}>
                  Separate multiple email addresses with commas
                </small>
              </div>

              {/* Department Filtering */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={editedRule.recipients?.useDepartmentFilter || false}
                    onChange={(e) => setEditedRule({
                      ...editedRule,
                      recipients: { 
                        ...editedRule.recipients, 
                        useDepartmentFilter: e.target.checked 
                      }
                    })}
                  />
                  <span>Only send to users with same department access</span>
                </label>
                
                {editedRule.recipients?.useDepartmentFilter && (
                  <div style={{ marginLeft: '1.5rem' }}>
                    <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                      Specific Departments (optional)
                    </label>
                    <MultiSelectDropdown
                      id="notification-departments"
                      label=""
                      options={availableDepartments}
                      value={editedRule.recipients?.departments || []}
                      onChange={(departments) => setEditedRule({
                        ...editedRule,
                        recipients: { ...editedRule.recipients, departments }
                      })}
                      placeholder="Select departments..."
                    />
                  </div>
                )}
              </div>

              {/* Include Case Submitter */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={editedRule.recipients?.includeSubmitter || false}
                    onChange={(e) => setEditedRule({
                      ...editedRule,
                      recipients: { 
                        ...editedRule.recipients, 
                        includeSubmitter: e.target.checked 
                      }
                    })}
                  />
                  <span>Always include case submitter</span>
                </label>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          justifyContent: 'flex-end',
          paddingTop: '1rem',
          borderTop: '1px solid #dee2e6'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.5rem',
              border: '1px solid #6c757d',
              backgroundColor: 'white',
              color: '#6c757d',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '0.5rem 1.5rem',
              border: 'none',
              backgroundColor: '#28a745',
              color: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailNotificationModal;