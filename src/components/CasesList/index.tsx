import React, { useState, useEffect } from 'react';
import { CaseBooking, FilterOptions, CaseStatus, User } from '../../types';
import { getCases, filterCases, updateCaseStatus, amendCase, cleanupProcessOrderDetails } from '../../utils/storage';
import { getCurrentUser } from '../../utils/auth';
import { useNotifications } from '../../contexts/NotificationContext';
import { CasesListProps } from './types';
import CasesFilter from './CasesFilter';
import CaseCard from './CaseCard';

const CasesList: React.FC<CasesListProps> = ({ onProcessCase, currentUser }) => {
  const { addNotification } = useNotifications();
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseBooking[]>([]);
  const [availableSubmitters, setAvailableSubmitters] = useState<string[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [tempFilters, setTempFilters] = useState<FilterOptions>({});
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [expandedStatusHistory, setExpandedStatusHistory] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCases, setShowAllCases] = useState(true);
  const [amendingCase, setAmendingCase] = useState<string | null>(null);
  const [amendmentData, setAmendmentData] = useState<Partial<CaseBooking>>({});
  const [processingCase, setProcessingCase] = useState<string | null>(null);
  const [processDetails, setProcessDetails] = useState('');
  const [deliveryCase, setDeliveryCase] = useState<string | null>(null);
  const [deliveryDetails, setDeliveryDetails] = useState('');
  const [receivedCase, setReceivedCase] = useState<string | null>(null);
  const [receivedDetails, setReceivedDetails] = useState('');
  const [receivedImage, setReceivedImage] = useState('');
  const [completedCase, setCompletedCase] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [orderSummary, setOrderSummary] = useState('');
  const [doNumber, setDoNumber] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [casesPerPage] = useState(5);

  const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = () => {
          const fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result as string
          };
          setAttachments(prev => [...prev, JSON.stringify(fileData)]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    // Clean up any corrupted data on component mount
    cleanupProcessOrderDetails();
    loadCases();
  }, [currentUser]);

  useEffect(() => {
    const currentUser = getCurrentUser();
    let filteredResults = filterCases(cases, filters);
    
    // Country-based filtering for Operations role
    if (currentUser?.role === 'operations' && currentUser.selectedCountry) {
      filteredResults = filteredResults.filter(caseItem => 
        caseItem.country === currentUser.selectedCountry
      );
    }
    
    // Department-based filtering
    if (currentUser?.departments && currentUser.departments.length > 0 && currentUser.role !== 'admin') {
      filteredResults = filteredResults.filter(caseItem => 
        currentUser.departments.includes(caseItem.department)
      );
    }
    
    setFilteredCases(filteredResults);
  }, [cases, filters]);

  const loadCases = () => {
    const allCases = getCases();
    
    // Extract unique submitters from all cases
    const uniqueSubmitters = Array.from(new Set(allCases.map(caseItem => caseItem.submittedBy)))
      .filter(submitter => submitter && submitter.trim())
      .sort();
    setAvailableSubmitters(uniqueSubmitters);

    // Extract unique hospitals from all cases
    const uniqueHospitals = Array.from(new Set(allCases.map(caseItem => caseItem.hospital)))
      .filter(hospital => hospital && hospital.trim())
      .sort();
    setAvailableHospitals(uniqueHospitals);
    
    // Admin and IT can view all cases, others are filtered by country
    if (currentUser?.role === 'admin' || currentUser?.role === 'it') {
      setCases(allCases);
    } else {
      const countryCases = currentUser?.selectedCountry 
        ? allCases.filter(caseItem => caseItem.country === currentUser.selectedCountry)
        : allCases;
      setCases(countryCases);
    }
  };

  const handleFilterChange = (field: keyof FilterOptions, value: string) => {
    setTempFilters(prev => ({
      ...prev,
      [field]: value || undefined
    }));
  };

  const applyFilters = () => {
    setFilters(tempFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setTempFilters({});
  };

  const handleQuickFilter = (filterKey: string, filterValue: string) => {
    const newFilters = { [filterKey]: filterValue };
    setTempFilters(newFilters);
    setFilters(newFilters);
  };

  const toggleCaseExpansion = (caseId: string) => {
    setExpandedCases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const toggleStatusHistoryExpansion = (caseId: string) => {
    setExpandedStatusHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (caseId: string, newStatus: CaseStatus) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const caseItem = cases.find(c => c.id === caseId);
    updateCaseStatus(caseId, newStatus, currentUser.name);
    loadCases();
    
    // Add notification for status change
    addNotification({
      title: 'Case Status Updated',
      message: `Case ${caseItem?.caseReferenceNumber || caseId} status changed to ${newStatus}`,
      type: 'success'
    });
  };

  const handleAmendCase = (caseItem: CaseBooking) => {
    setAmendingCase(caseItem.id);
    setAmendmentData({
      hospital: caseItem.hospital,
      department: caseItem.department,
      dateOfSurgery: caseItem.dateOfSurgery,
      procedureType: caseItem.procedureType,
      doctorName: caseItem.doctorName,
      timeOfProcedure: caseItem.timeOfProcedure,
      specialInstruction: caseItem.specialInstruction
    });
  };

  const handleSaveAmendment = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      amendCase(caseId, amendmentData, currentUser.name);
      alert('Case amended successfully!');
      setAmendingCase(null);
      setAmendmentData({});
      loadCases();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to amend case');
    }
  };

  const handleCancelAmendment = () => {
    setAmendingCase(null);
    setAmendmentData({});
  };

  const handleOrderProcessed = (caseId: string) => {
    setProcessingCase(caseId);
    setProcessDetails('');
  };

  const handleSaveProcessDetails = (caseId: string) => {
    if (!processDetails.trim()) {
      alert('Please enter process details before continuing.');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to process orders.');
      return;
    }

    try {
      const caseItem = cases.find(c => c.id === caseId);
      updateCaseStatus(caseId, 'Order Prepared', currentUser.name, processDetails);
      setProcessingCase(null);
      setProcessDetails('');
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Order Processed',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been processed and is now ready for delivery by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  const handleCancelProcessing = () => {
    setProcessingCase(null);
    setProcessDetails('');
  };

  // Pending Delivery (Hospital) workflow
  const handleOrderDelivered = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'driver' && currentUser.role !== 'admin')) {
      alert('Only Drivers can mark orders as delivered to hospital.');
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      updateCaseStatus(caseId, 'Pending Delivery (Hospital)', currentUser.name);
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Pending Delivery to Hospital',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been delivered to hospital by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  // Delivered (Hospital) workflow
  const handleOrderReceived = (caseId: string) => {
    setReceivedCase(caseId);
    setReceivedDetails('');
    setReceivedImage('');
  };

  const handleSaveOrderReceived = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'driver' && currentUser.role !== 'admin')) {
      alert('Only Drivers can mark orders as received at hospital.');
      return;
    }
    if (!receivedDetails.trim()) {
      alert('Please enter delivery details.');
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        deliveryDetails: receivedDetails,
        deliveryImage: receivedImage
      };
      updateCaseStatus(caseId, 'Delivered (Hospital)', currentUser.name, JSON.stringify(additionalData));
      setReceivedCase(null);
      setReceivedDetails('');
      setReceivedImage('');
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Delivered at Hospital',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been received at hospital by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  // Case Completed workflow
  const handleCaseCompleted = (caseId: string) => {
    setCompletedCase(caseId);
    setAttachments([]);
    setOrderSummary('');
    setDoNumber('');
  };

  const handleSaveCaseCompleted = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'sales' && currentUser.role !== 'admin')) {
      alert('Only Sales can mark cases as completed.');
      return;
    }
    if (!orderSummary.trim() || !doNumber.trim()) {
      alert('Please fill in all required fields: Order Summary and DO Number.');
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments,
        orderSummary,
        doNumber
      };
      updateCaseStatus(caseId, 'Case Completed', currentUser.name, JSON.stringify(additionalData));
      setCompletedCase(null);
      setAttachments([]);
      setOrderSummary('');
      setDoNumber('');
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Case Completed',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been completed by ${currentUser.name} with DO#: ${doNumber}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  // Delivered (Office) workflow
  const handleOrderDeliveredOffice = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'sales' && currentUser.role !== 'driver' && currentUser.role !== 'admin')) {
      alert('Only Sales and Driver can mark orders as delivered to office.');
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      updateCaseStatus(caseId, 'Delivered (Office)', currentUser.name);
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Delivered to Office',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been delivered to office by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  // To be billed workflow
  const handleToBeBilled = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      alert('You must be logged in to update case status.');
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      updateCaseStatus(caseId, 'To be billed', currentUser.name);
      loadCases();
      
      // Add notification for status change
      addNotification({
        title: 'Case Ready for Billing',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} is now ready to be billed - updated by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      alert('Failed to update case status');
    }
  };

  const handleCancelReceived = () => {
    setReceivedCase(null);
    setReceivedDetails('');
    setReceivedImage('');
  };

  const handleCancelCompleted = () => {
    setCompletedCase(null);
    setAttachments([]);
    setOrderSummary('');
    setDoNumber('');
  };

  const handleDeleteCase = (caseId: string, caseItem: CaseBooking) => {
    const currentUser = getCurrentUser();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'operation-manager')) {
      alert('Only Admin and Operations Manager can delete cases.');
      return;
    }

    const confirmMessage = `Are you sure you want to delete case "${caseItem.caseReferenceNumber}"?\n\nCase Details:\n- Hospital: ${caseItem.hospital}\n- Procedure: ${caseItem.procedureType}\n- Status: ${caseItem.status}\n\nThis action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      try {
        // Get all cases from localStorage
        const allCases = getCases();
        // Filter out the case to delete
        const updatedCases = allCases.filter(c => c.id !== caseId);
        // Save back to localStorage
        localStorage.setItem('case-booking-cases', JSON.stringify(updatedCases));
        
        // Reload cases to update the UI
        loadCases();
        alert(`Case "${caseItem.caseReferenceNumber}" has been deleted successfully.`);
      } catch (error) {
        alert('Failed to delete case. Please try again.');
      }
    }
  };

  // Pagination helpers for cases
  const getCurrentPageCases = () => {
    const indexOfLastCase = currentPage * casesPerPage;
    const indexOfFirstCase = indexOfLastCase - casesPerPage;
    return filteredCases.slice(indexOfFirstCase, indexOfLastCase);
  };

  const totalCasePages = Math.ceil(filteredCases.length / casesPerPage);

  const handleCasePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="cases-list">
      <div className="cases-header">
        <h2>All Submitted Cases</h2>
        <button onClick={loadCases} className="btn btn-outline-secondary btn-md refresh-button">
          Refresh
        </button>
      </div>

      <CasesFilter
        filters={filters}
        tempFilters={tempFilters}
        showFilters={showFilters}
        availableSubmitters={availableSubmitters}
        availableHospitals={availableHospitals}
        filteredCasesCount={filteredCases.length}
        totalCasesCount={cases.length}
        onFilterChange={handleFilterChange}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onQuickFilter={handleQuickFilter}
      />

      <div className="collapsible-section">
        <div className="section-header" onClick={() => setShowAllCases(!showAllCases)}>
          <h3>All Cases</h3>
          <span className="expand-icon">{showAllCases ? '▼' : '▶'}</span>
        </div>
        {showAllCases && (
          <>
            <div className="cases-count">
              Showing {((currentPage - 1) * casesPerPage) + 1} to {Math.min(currentPage * casesPerPage, filteredCases.length)} of {filteredCases.length} cases (Total: {cases.length})
            </div>

            <div className="cases-container">
              {filteredCases.length === 0 ? (
                <div className="no-cases">No cases found matching the current filters.</div>
              ) : (
                getCurrentPageCases().map(caseItem => (
                  <CaseCard
                    key={caseItem.id}
                    caseItem={caseItem}
                    currentUser={currentUser}
                    expandedCases={expandedCases}
                    expandedStatusHistory={expandedStatusHistory}
                    amendingCase={amendingCase}
                    amendmentData={amendmentData}
                    processingCase={processingCase}
                    processDetails={processDetails}
                    deliveryCase={deliveryCase}
                    deliveryDetails={deliveryDetails}
                    receivedCase={receivedCase}
                    receivedDetails={receivedDetails}
                    receivedImage={receivedImage}
                    completedCase={completedCase}
                    attachments={attachments}
                    orderSummary={orderSummary}
                    doNumber={doNumber}
                    onToggleExpansion={toggleCaseExpansion}
                    onToggleStatusHistory={toggleStatusHistoryExpansion}
                    onStatusChange={handleStatusChange}
                    onAmendCase={handleAmendCase}
                    onSaveAmendment={handleSaveAmendment}
                    onCancelAmendment={handleCancelAmendment}
                    onOrderProcessed={handleOrderProcessed}
                    onSaveProcessDetails={handleSaveProcessDetails}
                    onCancelProcessing={handleCancelProcessing}
                    onOrderDelivered={handleOrderDelivered}
                    onOrderReceived={handleOrderReceived}
                    onSaveOrderReceived={handleSaveOrderReceived}
                    onCancelReceived={handleCancelReceived}
                    onCaseCompleted={handleCaseCompleted}
                    onSaveCaseCompleted={handleSaveCaseCompleted}
                    onCancelCompleted={handleCancelCompleted}
                    onOrderDeliveredOffice={handleOrderDeliveredOffice}
                    onToBeBilled={handleToBeBilled}
                    onDeleteCase={handleDeleteCase}
                    onAttachmentUpload={handleAttachmentUpload}
                    onRemoveAttachment={removeAttachment}
                    onAmendmentDataChange={setAmendmentData}
                    onProcessDetailsChange={setProcessDetails}
                    onReceivedDetailsChange={setReceivedDetails}
                    onReceivedImageChange={setReceivedImage}
                    onOrderSummaryChange={setOrderSummary}
                    onDoNumberChange={setDoNumber}
                  />
                ))
              )}
            </div>
            
            {totalCasePages > 1 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  Page {currentPage} of {totalCasePages}
                </div>
                <div className="pagination-controls">
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleCasePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    First
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleCasePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                  {[...Array(totalCasePages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (pageNumber === 1 || pageNumber === totalCasePages || (pageNumber >= currentPage - 2 && pageNumber <= currentPage + 2)) {
                      return (
                        <button
                          key={pageNumber}
                          className={`btn btn-sm ${pageNumber === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                          onClick={() => handleCasePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (pageNumber === currentPage - 3 || pageNumber === currentPage + 3) {
                      return <span key={pageNumber} className="pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleCasePageChange(currentPage + 1)}
                    disabled={currentPage === totalCasePages}
                  >
                    Next
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => handleCasePageChange(totalCasePages)}
                    disabled={currentPage === totalCasePages}
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CasesList;