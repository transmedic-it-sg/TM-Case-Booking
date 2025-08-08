/**
 * Optimized CaseCard Component
 * Implements React.memo, useMemo, useCallback for better performance
 * Reduces unnecessary re-renders and memory usage
 */

import React, { useCallback, useMemo } from 'react';
import { CaseCardProps } from '../CasesList/types';
import { getStatusColor, getNextResponsibleRole, formatDateTime } from '../CasesList/utils';
import { OptimizedCache, debounce } from '../../utils/performanceOptimizer';

// Memoized sub-components for better performance
const CaseCardHeader = React.memo(({ 
  caseItem, 
  isExpanded, 
  onToggle 
}: { 
  caseItem: any; 
  isExpanded: boolean; 
  onToggle: () => void; 
}) => {
  const statusColor = useMemo(() => getStatusColor(caseItem.status), [caseItem.status]);
  
  return (
    <div className="case-card-header" onClick={onToggle}>
      <div className="case-header-left">
        <h3 className="case-reference">{caseItem.caseReferenceNumber}</h3>
        <div className="case-basic-info">
          <span className="hospital">{caseItem.hospital}</span>
          <span className="department">{caseItem.department}</span>
        </div>
      </div>
      <div className="case-header-right">
        <span className={`status-badge ${statusColor}`}>
          {caseItem.status}
        </span>
        <span className="expand-icon">
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>
    </div>
  );
});

const CaseCardDetails = React.memo(({ 
  caseItem, 
  currentUser 
}: { 
  caseItem: any; 
  currentUser: any; 
}) => {
  const formattedDate = useMemo(() => 
    formatDateTime(caseItem.dateOfSurgery), 
    [caseItem.dateOfSurgery]
  );

  return (
    <div className="case-details">
      <div className="detail-row">
        <span className="label">Surgery Date:</span>
        <span className="value">{formattedDate}</span>
      </div>
      <div className="detail-row">
        <span className="label">Procedure:</span>
        <span className="value">{caseItem.procedureName}</span>
      </div>
      <div className="detail-row">
        <span className="label">Doctor:</span>
        <span className="value">{caseItem.doctorName || 'Not specified'}</span>
      </div>
      {caseItem.timeOfProcedure && (
        <div className="detail-row">
          <span className="label">Time:</span>
          <span className="value">{caseItem.timeOfProcedure}</span>
        </div>
      )}
    </div>
  );
});

// Main optimized component with React.memo and custom comparison
const OptimizedCaseCard: React.FC<CaseCardProps> = React.memo(({
  caseItem,
  currentUser,
  expandedCases,
  onToggleExpansion,
  onStatusChange,
  // ... other props
}) => {
  const cache = OptimizedCache.getInstance();
  
  // Memoize expensive calculations
  const isExpanded = useMemo(() => 
    Array.isArray(expandedCases) ? expandedCases.includes(caseItem.id) : false, 
    [expandedCases, caseItem.id]
  );

  const nextRole = useMemo(() => 
    getNextResponsibleRole(caseItem.status), 
    [caseItem.status]
  );

  // Memoize and cache user permissions check
  const canUserEditCase = useMemo(() => {
    const cacheKey = `permissions-${currentUser?.role}-${caseItem.status}`;
    let cached = cache.get(cacheKey);
    
    if (cached === null) {
      // Simplified permission check - customize based on your logic
      cached = currentUser && (
        currentUser.role === 'admin' ||
        (currentUser.role === 'operations-manager' && caseItem.status !== 'Case Closed') ||
        (currentUser.role === nextRole && caseItem.status !== 'Case Closed')
      );
      cache.set(cacheKey, cached, 10); // Cache for 10 minutes
    }
    
    return cached;
  }, [currentUser, caseItem.status, nextRole, cache]);

  // Debounced toggle function to prevent rapid clicking
  const debouncedToggle = useCallback(
    debounce(() => onToggleExpansion(caseItem.id), 200),
    [onToggleExpansion, caseItem.id]
  );

  // Memoized status change handler
  const handleStatusChange = useCallback(
    (newStatus: string) => {
      onStatusChange(caseItem.id, newStatus as any);
    },
    [onStatusChange, caseItem.id]
  );

  return (
    <div className={`case-card ${isExpanded ? 'expanded' : ''}`}>
      <CaseCardHeader
        caseItem={caseItem}
        isExpanded={isExpanded}
        onToggle={debouncedToggle}
      />
      
      {isExpanded && (
        <div className="case-card-content">
          <CaseCardDetails
            caseItem={caseItem}
            currentUser={currentUser}
          />
          
          {canUserEditCase && (
            <div className="case-actions">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleStatusChange('Order Preparation')}
                disabled={caseItem.status !== 'Case Booked'}
              >
                Process Order
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleStatusChange('Case Completed')}
                disabled={caseItem.status !== 'Delivered (Hospital)'}
              >
                Mark Complete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if essential props have changed
  const prevExpanded = Array.isArray(prevProps.expandedCases) ? prevProps.expandedCases.includes(prevProps.caseItem.id) : false;
  const nextExpanded = Array.isArray(nextProps.expandedCases) ? nextProps.expandedCases.includes(nextProps.caseItem.id) : false;
  
  return (
    prevProps.caseItem.id === nextProps.caseItem.id &&
    prevProps.caseItem.status === nextProps.caseItem.status &&
    prevProps.caseItem.dateOfSurgery === nextProps.caseItem.dateOfSurgery &&
    prevExpanded === nextExpanded &&
    prevProps.currentUser?.role === nextProps.currentUser?.role
  );
});

OptimizedCaseCard.displayName = 'OptimizedCaseCard';

export default OptimizedCaseCard;