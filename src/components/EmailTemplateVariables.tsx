import React from 'react';

interface EmailTemplateVariablesProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const EmailTemplateVariables: React.FC<EmailTemplateVariablesProps> = ({
  isCollapsed,
  setIsCollapsed
}) => {
  return (
    <div className="config-section">
      <div
        className="section-header collapsible-header"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>📝 Template Variables Reference</h3>
          <div className="provider-status-badge-inline">
            <span className="status-icon">💡</span>
            <span style={{ fontSize: '0.85rem' }}>Email Template Helper</span>
          </div>
        </div>
        <span className={`chevron ${isCollapsed ? 'collapsed' : 'expanded'}`}>
          {isCollapsed ? '▶' : '▼'}
        </span>
      </div>

      {!isCollapsed && (
        <div className="section-content">
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f0f8ff', borderRadius: '8px', border: '1px solid #4fc3f7' }}>
            <h4 style={{ color: '#0277bd', margin: '0 0 0.5rem 0' }}>📋 Available Template Variables</h4>
            <p style={{ margin: '0', color: '#37474f', fontSize: '0.9rem' }}>
              Use these variables in your email subject and body templates. They will be automatically replaced with actual case data when emails are sent.
            </p>
          </div>

          <div className="template-variables-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Basic Case Information */}
            <div className="variable-category" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fafafa'
            }}>
              <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>📋 Basic Case Information</h5>
              
              {[
                { var: '{{caseReference}}', desc: 'Case Reference Number' },
                { var: '{{hospital}}', desc: 'Hospital Name' },
                { var: '{{department}}', desc: 'Department' },
                { var: '{{country}}', desc: 'Country' },
                { var: '{{Status}}', desc: 'Current Status' },
                { var: '{{status}}', desc: 'Current Status (lowercase)' },
                { var: '{{mrn}}', desc: 'Medical Record Number' },
                { var: '{{patientName}}', desc: 'Patient Name' }
              ].map(item => (
                <div key={item.var} className="variable-item" style={{ marginBottom: '0.75rem' }}>
                  <code className="variable-code" style={{
                    background: '#e3f2fd',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#1565c0'
                  }}>
                    {item.var}
                  </code>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Surgery Details */}
            <div className="variable-category" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fafafa'
            }}>
              <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>🏥 Surgery Details</h5>
              
              {[
                { var: '{{dateOfSurgery}}', desc: 'Surgery Date' },
                { var: '{{timeOfProcedure}}', desc: 'Surgery Time' },
                { var: '{{procedureType}}', desc: 'Procedure Type' },
                { var: '{{procedureName}}', desc: 'Procedure Name' },
                { var: '{{doctorName}}', desc: 'Doctor/Surgeon Name' },
                { var: '{{surgerySetSelection}}', desc: 'Surgery Sets (List)' },
                { var: '{{surgeryImplants}}', desc: 'Surgery Implants' }
              ].map(item => (
                <div key={item.var} className="variable-item" style={{ marginBottom: '0.75rem' }}>
                  <code className="variable-code" style={{
                    background: '#e8f5e8',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#2e7d32'
                  }}>
                    {item.var}
                  </code>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* User & Timestamps */}
            <div className="variable-category" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fafafa'
            }}>
              <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>👤 User & Timestamps</h5>
              
              {[
                { var: '{{submittedBy}}', desc: 'Case Submitter' },
                { var: '{{submittedAt}}', desc: 'Submission Date/Time' },
                { var: '{{processedBy}}', desc: 'Last Processed By' },
                { var: '{{processedAt}}', desc: 'Last Processed Date/Time' },
                { var: '{{currentDateTime}}', desc: 'Current Date/Time' },
                { var: '{{userEmail}}', desc: 'Current User Email' },
                { var: '{{userName}}', desc: 'Current User Name' }
              ].map(item => (
                <div key={item.var} className="variable-item" style={{ marginBottom: '0.75rem' }}>
                  <code className="variable-code" style={{
                    background: '#fff3e0',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#f57c00'
                  }}>
                    {item.var}
                  </code>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>

            {/* Additional Information */}
            <div className="variable-category" style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '1rem',
              background: '#fafafa'
            }}>
              <h5 style={{ color: '#1976d2', marginBottom: '1rem' }}>📝 Additional Information</h5>
              
              {[
                { var: '{{specialInstruction}}', desc: 'Special Instructions' },
                { var: '{{remarks}}', desc: 'Case Remarks' },
                { var: '{{salesOrderNo}}', desc: 'Sales Order Number' },
                { var: '{{poNo}}', desc: 'Purchase Order Number' },
                { var: '{{deliveryAddress}}', desc: 'Delivery Address' },
                { var: '{{contactPerson}}', desc: 'Contact Person' },
                { var: '{{contactNumber}}', desc: 'Contact Number' }
              ].map(item => (
                <div key={item.var} className="variable-item" style={{ marginBottom: '0.75rem' }}>
                  <code className="variable-code" style={{
                    background: '#f3e5f5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: '#7b1fa2'
                  }}>
                    {item.var}
                  </code>
                  <span style={{ marginLeft: '0.5rem', fontSize: '0.9rem', color: '#424242' }}>
                    {item.desc}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: '#fff9c4',
            borderRadius: '8px',
            border: '1px solid #f9a825',
            marginTop: '1rem'
          }}>
            <h5 style={{ color: '#f57c00', margin: '0 0 0.5rem 0' }}>💡 Usage Tips</h5>
            <ul style={{ margin: '0', paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#6d4c41' }}>
              <li>Variables are case-sensitive - use them exactly as shown</li>
              <li>Variables will be replaced with actual data when emails are sent</li>
              <li>If a variable has no data, it will be replaced with an empty string</li>
              <li>You can use multiple variables in both subject and body templates</li>
              <li>Test your templates before enabling notifications</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailTemplateVariables;