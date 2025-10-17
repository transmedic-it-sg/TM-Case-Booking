import React from 'react';
import SimpleMultiSelectDropdown from './SimpleMultiSelectDropdown';
import { getAllRoles } from '../data/permissionMatrixData';
import { CASE_STATUSES } from '../constants/statuses';

// Define proper workflow order for email notifications
const WORKFLOW_ORDER = [
  'Case Booked',
  'Preparing Order',
  'Order Prepared',
  'Sales Approved',
  'Pending Delivery (Hospital)',
  'Delivered (Hospital)',
  'Case Completed',
  'Pending Collection (At Hospital)',
  'Delivered (Office)',
  'To be billed',
  'Case Closed',
  'Case Cancelled', // At the end
  'Amendments'
];

interface EmailNotificationRulesProps {
  selectedCountry: string;
  emailMatrixConfigs: any;
  ruleCollapsedStates: Record<number, boolean>;
  availableDepartments: string[];
  isNotificationRulesCollapsed: boolean;
  setIsNotificationRulesCollapsed: (collapsed: boolean) => void;
  toggleRuleCollapse: (index: number) => void;
  updateNotificationRule: (index: number, updates: any) => void;
  saveNotificationMatrix: () => void;
}

const EmailNotificationRulesV132: React.FC<EmailNotificationRulesProps> = ({
  selectedCountry,
  emailMatrixConfigs,
  ruleCollapsedStates,
  availableDepartments,
  isNotificationRulesCollapsed,
  setIsNotificationRulesCollapsed,
  toggleRuleCollapse,
  updateNotificationRule,
  saveNotificationMatrix
}) => {
  const allRoles = getAllRoles();
  const availableRoles = allRoles.map(role => role.id);

  return (
    <div className="config-section">
      <div
        className="section-header collapsible-header"
        onClick={() => setIsNotificationRulesCollapsed(!isNotificationRulesCollapsed)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>📮 Email Notification Rules</h3>
          {emailMatrixConfigs[selectedCountry] && (
            <div className="provider-status-badge-inline">
              <span className="status-icon">📊</span>
              <span style={{ fontSize: '0.85rem' }}>
                {emailMatrixConfigs[selectedCountry].rules.filter((rule: any) => rule.enabled).length} of {emailMatrixConfigs[selectedCountry].rules.length} Active
              </span>
            </div>
          )}
        </div>
        <span className={`chevron ${isNotificationRulesCollapsed ? 'collapsed' : 'expanded'}`}>
          {isNotificationRulesCollapsed ? '▶' : '▼'}
        </span>
      </div>

      {!isNotificationRulesCollapsed && (
        <div className="section-content">
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#e3f2fd', borderRadius: '8px', border: '1px solid #2196f3' }}>
            <h4 style={{ color: '#1976d2', margin: '0 0 0.5rem 0' }}>📋 Configure Status-Based Email Notifications</h4>
            <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
              Set up automatic email notifications for each case status change. Configure who receives notifications and customize email templates.
            </p>
          </div>

          {/* Important notice about Case Booked notifications */}
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#e8f5e8',
            borderRadius: '8px',
            border: '2px solid #4caf50',
            borderLeft: '6px solid #4caf50'
          }}>
            <h5 style={{ color: '#2e7d32', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🆕 <strong>New Case Notifications</strong>
            </h5>
            <p style={{ margin: '0', color: '#1b5e20', fontSize: '0.9rem' }}>
              <strong>"Case Booked"</strong> notifications are automatically enabled and pre-configured to notify operations teams when new cases are submitted.
              This ensures immediate awareness of new case bookings requiring attention.
            </p>
          </div>

          {emailMatrixConfigs[selectedCountry] && (
            <div className="notification-matrix">
              {/* Sort rules by workflow order */}
              {emailMatrixConfigs[selectedCountry].rules
                .sort((a: any, b: any) => {
                  const aIndex = WORKFLOW_ORDER.indexOf(a.status);
                  const bIndex = WORKFLOW_ORDER.indexOf(b.status);
                  // If both are in the workflow order, sort by that order
                  if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                  // If only one is in the workflow order, that comes first
                  if (aIndex !== -1) return -1;
                  if (bIndex !== -1) return 1;
                  // Otherwise maintain original order
                  return 0;
                })
                .map((rule: any, index: number) => {
                const isRuleCollapsed = ruleCollapsedStates[index] !== false;
                const isCaseBookedRule = rule.status === CASE_STATUSES.CASE_BOOKED;

                return (
                  <div key={rule.status} className="notification-rule" style={{
                    border: isCaseBookedRule ? '2px solid #4caf50' : '1px solid #dee2e6',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: rule.enabled ? (isCaseBookedRule ? '#e8f5e8' : '#f8f9fa') : '#ffffff',
                    position: 'relative'
                  }}>
                    {/* Special badge for Case Booked */}
                    {isCaseBookedRule && (
                      <div style={{
                        position: 'absolute',
                        top: '-10px',
                        right: '15px',
                        background: '#4caf50',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}>
                        🆕 NEW CASES
                      </div>
                    )}

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: rule.enabled && !isRuleCollapsed ? '1rem' : '0',
                        cursor: rule.enabled ? 'pointer' : 'default'
                      }}
                      onClick={rule.enabled ? () => toggleRuleCollapse(index) : undefined}
                    >
                      <h5 style={{
                        margin: '0',
                        color: isCaseBookedRule ? '#2e7d32' : '#495057',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: isCaseBookedRule ? 'bold' : 'normal'
                      }}>
                        {isCaseBookedRule ? '🆕' : '📊'} {rule.status}
                        {rule.enabled && (
                          <span style={{
                            fontSize: '0.8rem',
                            transform: isRuleCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease',
                            color: '#6c757d',
                            marginLeft: '0.5rem'
                          }}>
                            ▼
                          </span>
                        )}
                      </h5>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => {
                            updateNotificationRule(index, { enabled: e.target.checked });
                          }}
                          style={{ transform: 'scale(1.2)' }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span style={{ fontWeight: '500', color: rule.enabled ? '#28a745' : '#6c757d' }}>
                          {rule.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </label>
                    </div>

                    {rule.enabled && !isRuleCollapsed && (
                      <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #28a745' }}>
                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                            📧 Email Subject
                          </label>
                          <input
                            type="text"
                            value={rule.template?.subject || ''}
                            onChange={(e) => updateNotificationRule(index, {
                              template: { ...rule.template, subject: e.target.value }
                            })}
                            className="form-control"
                            placeholder="Email subject line"
                          />
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                            📝 Email Body Template
                          </label>
                          <textarea
                            value={rule.template?.body || ''}
                            onChange={(e) => updateNotificationRule(index, {
                              template: { ...rule.template, body: e.target.value }
                            })}
                            className="form-control"
                            rows={4}
                            placeholder="Email body template (use {{caseReference}}, {{hospital}}, {{dateOfSurgery}} as placeholders)"
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                          <div>
                            <SimpleMultiSelectDropdown
                              id={`roles-${index}`}
                              label="👥 Notify User Roles"
                              options={availableRoles}
                              value={rule.recipients?.roles || []}
                              onChange={(selectedRoles: string[]) => {
                                updateNotificationRule(index, {
                                  recipients: { ...rule.recipients, roles: selectedRoles }
                                });
                              }}
                              placeholder="Select user roles to notify..."
                            />

                            <div style={{ marginTop: '1rem' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={rule.recipients?.includeSubmitter || false}
                                  onChange={(e) => updateNotificationRule(index, {
                                    recipients: { ...rule.recipients, includeSubmitter: e.target.checked }
                                  })}
                                  style={{ transform: 'scale(1.1)' }}
                                />
                                <span style={{ fontWeight: '500', color: '#495057' }}>
                                  📝 Include Case Submitter
                                </span>
                              </label>
                              <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
                                Automatically notify the person who submitted the case
                              </small>
                            </div>
                          </div>

                          <div>
                            <label style={{ display: 'block', fontWeight: '600', marginBottom: '0.5rem', color: '#495057' }}>
                              📮 Additional Email Addresses
                            </label>
                            <textarea
                              value={(rule.recipients?.specificEmails || []).join('\n')}
                              onChange={(e) => {
                                const emails = e.target.value.split('\n').filter((email: string) => email.trim());
                                updateNotificationRule(index, {
                                  recipients: { ...rule.recipients, specificEmails: emails }
                                });
                              }}
                              className="form-control"
                              rows={4}
                              placeholder="Enter email addresses (one per line)&#10;example@company.com&#10;manager@company.com"
                            />
                            <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>One email address per line</small>
                          </div>
                        </div>

                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
                          <h5 style={{ color: '#495057', fontSize: '0.9rem', margin: '0 0 1rem 0', fontWeight: '600' }}>
                            🏥 Department-Based Filtering
                          </h5>

                          <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={rule.recipients?.requireSameDepartment || false}
                                onChange={(e) => updateNotificationRule(index, {
                                  recipients: { ...rule.recipients, requireSameDepartment: e.target.checked }
                                })}
                                style={{ transform: 'scale(1.1)' }}
                              />
                              <span style={{ fontWeight: '500', color: '#495057' }}>
                                🎯 Only notify users with access to case department
                              </span>
                            </label>
                            <small style={{ color: '#6c757d', fontSize: '0.8rem', marginLeft: '1.5rem' }}>
                              Users must have the same department as the case to receive notifications
                            </small>
                          </div>

                          <div>
                            <SimpleMultiSelectDropdown
                              id={`departments-${index}`}
                              label="🏥 Additional Department Filter (Optional)"
                              options={availableDepartments}
                              value={rule.recipients?.departmentFilter || []}
                              onChange={(selectedDepartments: string[]) => {
                                updateNotificationRule(index, {
                                  recipients: { ...rule.recipients, departmentFilter: selectedDepartments }
                                });
                              }}
                              placeholder="Select specific departments to include..."
                            />
                            <small style={{ color: '#6c757d', fontSize: '0.8rem' }}>
                              If specified, only users in these departments will be notified (in addition to department access requirement above)
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1rem', borderTop: '2px solid #dee2e6' }}>
                <button
                  onClick={saveNotificationMatrix}
                  className="btn btn-primary btn-lg"
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    minWidth: '200px',
                    whiteSpace: 'nowrap'
                  }}
                  title="Save notification matrix configuration"
                >
                  💾 Save Notification Rules
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailNotificationRulesV132;