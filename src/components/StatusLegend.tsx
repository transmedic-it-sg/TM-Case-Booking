import React, { useState } from 'react';
import { CaseStatus } from '../types';
import { getStatusColor } from './CasesList/utils';

const StatusLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusList: { status: CaseStatus; description: string }[] = [
    { status: 'Case Booked', description: 'Initial case submission' },
    { status: 'Order Preparation', description: 'Processing order details' },
    { status: 'Pending Preparation', description: 'Awaiting preparation' },
    { status: 'Order Prepared', description: 'Ready for delivery' },
    { status: 'Pending Delivery (Hospital)', description: 'Pending hospital delivery' },
    { status: 'Delivered (Hospital)', description: 'Delivered to hospital' },
    { status: 'Case Completed', description: 'Surgery completed' },
    { status: 'Delivered (Office)', description: 'Equipment returned to office' },
    { status: 'To be billed', description: 'Ready for billing' },
    { status: 'Case Cancelled', description: 'Case cancelled' }
  ];

  return (
    <div className="status-legend">
      <button 
        className="legend-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-controls="legend-content"
      >
        <span className="legend-title">📊 Status Colors</span>
        <span className={`legend-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </button>
      
      {isExpanded && (
        <div id="legend-content" className="legend-content">
          <div className="legend-grid">
            {statusList.map(({ status, description }) => (
              <div key={status} className="legend-item">
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(status) }}
                ></div>
                <div className="status-info">
                  <span className="status-name">{status}</span>
                  <span className="status-description">{description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusLegend;