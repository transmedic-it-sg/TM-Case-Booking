/**
 * CaseHeader Component - Case card header with basic info
 * Extracted from the massive CaseCard component
 */

import React from 'react';
import { CaseHeaderProps } from './types';
import { useCaseData } from './hooks/useCaseData';

// Helper function to format doctor names consistently
const formatDoctorName = (name: string): string => {
  if (!name || name === 'Not specified') return name;
  const trimmed = name.trim();
  // If name already starts with "Dr" or "Dr.", don't add another "Dr."
  if (trimmed.toLowerCase().startsWith('dr')) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
};

const CaseHeader: React.FC<CaseHeaderProps> = ({
  caseItem,
  currentUser,
  isExpanded,
  onToggleExpansion
}) => {
  const {
    statusColor,
    formattedSurgeryDate,
    isUrgent,
    isOverdue,
    displayHospital,
    displayDoctor
  } = useCaseData(caseItem);

  return (
    <div
      className="case-card-header"
      style={{
        background: `linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%)`
      }}
    >
      <div className="case-header-main">
        <div className="case-title-section">
          <h3 className="case-reference">
            {caseItem.caseReferenceNumber}
            {isUrgent && <span className="urgency-indicator">⚡ URGENT</span>}
            {isOverdue && <span className="overdue-indicator">⚠️ OVERDUE</span>}
          </h3>
          <div className="case-basic-info">
            <span className="hospital-name">{displayHospital}</span>
            <span className="doctor-name">
              {formatDoctorName(displayDoctor)}
            </span>
          </div>
        </div>

        <div className="case-meta-section">
          <div className="surgery-date">
            <span className="date-label">Surgery Date</span>
            <span className="date-value">{formattedSurgeryDate}</span>
          </div>

          <div className="country-badge-container">
            <span className={`country-badge ${caseItem.country.toLowerCase().replace(' ', '-')}`}>
              {getCountryEmoji(caseItem.country)} {caseItem.country}
            </span>
          </div>
        </div>
      </div>

      <div className="case-header-actions">
        <div className="status-indicator">
          <span className={`status-badge ${caseItem.status.toLowerCase().replace(/\s+/g, '-')}`}>
            {caseItem.status}
          </span>
        </div>

        <button
          className={`expansion-toggle ${isExpanded ? 'expanded' : ''}`}
          onClick={onToggleExpansion}
          aria-label={isExpanded ? 'Collapse case details' : 'Expand case details'}
        >
          <span className="toggle-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="toggle-text">
            {isExpanded ? 'Less' : 'More'}
          </span>
        </button>
      </div>
    </div>
  );
};

// Helper function for country emojis
const getCountryEmoji = (country: string): string => {
  const emojiMap: Record<string, string> = {
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'Philippines': '🇵🇭',
    'Indonesia': '🇮🇩',
    'Vietnam': '🇻🇳',
    'Hong Kong': '🇭🇰',
    'Thailand': '🇹🇭'
  };
  return emojiMap[country] || '🌍';
};

export default React.memo(CaseHeader);