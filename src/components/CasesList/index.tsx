import React, { useState, useEffect } from 'react';
import { CaseBooking, FilterOptions, CaseStatus } from '../../types';
import { getCases, filterCases, updateCaseStatus, amendCase, cleanupProcessOrderDetails, processCaseOrder } from '../../utils/storage';
import { getCurrentUser } from '../../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useNotifications } from '../../contexts/NotificationContext';
import { CasesListProps } from './types';
import CasesFilter from './CasesFilter';
import CaseCard from './CaseCard';
import StatusChangeSuccessPopup from '../StatusChangeSuccessPopup';
import CustomModal from '../CustomModal';
import { useModal } from '../../hooks/useModal';
import { USER_ROLES } from '../../constants/permissions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { userHasDepartmentAccess } from '../../utils/departmentUtils';

const CasesList: React.FC<CasesListProps> = ({ onProcessCase, currentUser, highlightedCaseId, onClearHighlight, onNavigateToPermissions }) => {
  const { addNotification } = useNotifications();
  const { modal, closeModal, showConfirm } = useModal();
  const [cases, setCases] = useState<CaseBooking[]>([]);
  const [filteredCases, setFilteredCases] = useState<CaseBooking[]>([]);
  const [availableSubmitters, setAvailableSubmitters] = useState<string[]>([]);
  const [availableHospitals, setAvailableHospitals] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [tempFilters, setTempFilters] = useState<FilterOptions>({});
  const [expandedCases, setExpandedCases] = useState<Set<string>>(new Set());
  const [expandedStatusHistory, setExpandedStatusHistory] = useState<Set<string>>(new Set());
  const [expandedAmendmentHistory, setExpandedAmendmentHistory] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCases, setShowAllCases] = useState(true);
  const [amendingCase, setAmendingCase] = useState<string | null>(null);
  const [amendmentData, setAmendmentData] = useState<Partial<CaseBooking>>({});
  const [processingCase, setProcessingCase] = useState<string | null>(null);
  const [processDetails, setProcessDetails] = useState('');
  const [deliveryCase] = useState<string | null>(null);
  const [deliveryDetails] = useState('');
  const [receivedCase, setReceivedCase] = useState<string | null>(null);
  const [receivedDetails, setReceivedDetails] = useState('');
  const [receivedImage, setReceivedImage] = useState('');
  const [completedCase, setCompletedCase] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [orderSummary, setOrderSummary] = useState('');
  const [doNumber, setDoNumber] = useState('');
  
  // State for new comment and attachment fields for status transitions
  const [processAttachments, setProcessAttachments] = useState<string[]>([]);
  const [processComments, setProcessComments] = useState('');
  const [hospitalDeliveryAttachments, setHospitalDeliveryAttachments] = useState<string[]>([]);
  const [hospitalDeliveryComments, setHospitalDeliveryComments] = useState('');
  const [hospitalDeliveryCase, setHospitalDeliveryCase] = useState<string | null>(null);
  const [officeDeliveryCase, setOfficeDeliveryCase] = useState<string | null>(null);
  const [officeDeliveryAttachments, setOfficeDeliveryAttachments] = useState<string[]>([]);
  const [officeDeliveryComments, setOfficeDeliveryComments] = useState('');
  const [pendingOfficeCase, setPendingOfficeCase] = useState<string | null>(null);
  const [pendingOfficeAttachments, setPendingOfficeAttachments] = useState<string[]>([]);
  const [pendingOfficeComments, setPendingOfficeComments] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [casesPerPage] = useState(5);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    const loadData = async () => {
      await loadCases();
    };
    loadData();
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    const currentUser = getCurrentUser();
    let filteredResults = filterCases(cases, filters);
    
    // Convert country name to country code for comparison
    const getCountryCode = (country: string) => {
      const countryMap: { [key: string]: string } = {
        'Singapore': 'SG',
        'Malaysia': 'MY',
        'Philippines': 'PH',
        'Indonesia': 'ID',
        'Vietnam': 'VN',
        'Hong Kong': 'HK',
        'Thailand': 'TH'
      };
      return countryMap[country] || 'SG';
    };
    
    // Country-based filtering for ALL non-admin/IT users
    if (currentUser && currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.IT) {
      if (currentUser.countries && currentUser.countries.length > 0) {
        // Convert user's country names to country codes and filter cases
        const userCountryCodes = currentUser.countries.map(country => getCountryCode(country));
        filteredResults = filteredResults.filter(caseItem => 
          userCountryCodes.includes(caseItem.country)
        );
      }
    }
    
    // Department-based filtering (excluding Operations Managers who have broader access)
    if (currentUser?.departments && currentUser.departments.length > 0 && 
        currentUser.role !== USER_ROLES.ADMIN && 
        currentUser.role !== USER_ROLES.OPERATIONS_MANAGER && 
        currentUser.role !== USER_ROLES.IT) {
      
      // Clean department names - remove country prefixes like "Singapore:", "Malaysia:"
      const cleanDepartmentName = (department: string) => {
        return department.replace(/^[A-Za-z\s]+:/, '').trim();
      };
      
      const userDepartments = currentUser.departments.map(cleanDepartmentName);
      
      filteredResults = filteredResults.filter(caseItem => 
        userDepartments.includes(cleanDepartmentName(caseItem.department))
      );
    }
    
    setFilteredCases(filteredResults);
  }, [cases, filters]);

  // Handle highlighted case from calendar
  useEffect(() => {
    if (highlightedCaseId) {
      // Find which page the highlighted case is on
      const caseIndex = filteredCases.findIndex(c => c.id === highlightedCaseId);
      if (caseIndex !== -1) {
        const targetPage = Math.ceil((caseIndex + 1) / casesPerPage);
        setCurrentPage(targetPage);
      }
      
      // Auto-expand the highlighted case
      setExpandedCases(prev => new Set([...Array.from(prev), highlightedCaseId]));
      
      // Scroll to the case after a small delay to ensure it's rendered
      setTimeout(() => {
        const caseElement = document.getElementById(`case-${highlightedCaseId}`);
        if (caseElement) {
          caseElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Add highlight effect
          caseElement.classList.add('highlighted-case');
          setTimeout(() => {
            caseElement.classList.remove('highlighted-case');
            onClearHighlight?.();
          }, 3000);
        }
      }, 100);
    }
  }, [highlightedCaseId, onClearHighlight, filteredCases, casesPerPage]);

  const loadCases = async () => {
    try {
      // Convert country name to country code for database operations
      const getCountryCode = (country: string) => {
        const countryMap: { [key: string]: string } = {
          'Singapore': 'SG',
          'Malaysia': 'MY',
          'Philippines': 'PH',
          'Indonesia': 'ID',
          'Vietnam': 'VN',
          'Hong Kong': 'HK',
          'Thailand': 'TH'
        };
        return countryMap[country] || 'SG';
      };
      
      const userCountry = currentUser?.selectedCountry;
      const countryCode = userCountry ? getCountryCode(userCountry) : undefined;
      
      const allCases = await getCases(countryCode);
      
      // Ensure allCases is an array
      if (!Array.isArray(allCases)) {
        console.error('getCases returned non-array:', allCases);
        setCases([]);
        setAvailableSubmitters([]);
        setAvailableHospitals([]);
        addNotification({
          title: 'Data Load Error',
          message: 'Failed to load cases. Please try refreshing the page.',
          type: 'error'
        });
        return;
      }
      
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
        const countryCases = countryCode 
          ? allCases.filter(caseItem => caseItem.country === countryCode)
          : allCases;
        setCases(countryCases);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      setCases([]);
      setAvailableSubmitters([]);
      setAvailableHospitals([]);
      addNotification({
        title: 'Data Load Error',
        message: `Failed to load cases: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
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

  const toggleAmendmentHistoryExpansion = (caseId: string) => {
    setExpandedAmendmentHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  };

  const handleStatusChange = async (caseId: string, newStatus: CaseStatus) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const caseItem = cases.find(c => c.id === caseId);
    await updateCaseStatus(caseId, newStatus, currentUser.id);
    await loadCases();
    
    // Reset to page 1 and expand the updated case
    setCurrentPage(1);
    setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
    
    // Show success popup
    setSuccessMessage(`Case status successfully updated to "${newStatus}"`);
    setShowSuccessPopup(true);
    
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

  const handleSaveAmendment = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    try {
      const isAdmin = currentUser.role === 'admin';
      await amendCase(caseId, amendmentData, currentUser.id, isAdmin);
      setAmendingCase(null);
      setAmendmentData({});
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Case amended successfully!');
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Failed to amend case:', error);
    }
  };

  const handleCancelAmendment = () => {
    setAmendingCase(null);
    setAmendmentData({});
  };

  const handleOrderProcessed = (caseId: string) => {
    setProcessingCase(caseId);
    setProcessDetails('');
    setProcessAttachments([]);
  };

  const handleSaveProcessDetails = async (caseId: string) => {
    if (!processDetails.trim()) {
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }

    try {
      const caseItem = cases.find(c => c.id === caseId);
      // Use the specific processCaseOrder function for order processing
      await processCaseOrder(caseId, currentUser.id, processDetails);
      setProcessingCase(null);
      setProcessDetails('');
      setProcessAttachments([]);
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Order successfully marked as prepared');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Order Processed',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been processed and is now ready for delivery by ${currentUser.name}`,
        type: 'success'
      });

      // Email notifications are now handled automatically by the Email Notification Rules system
      // in the updateCaseStatus function - no hardcoded logic needed here
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const handleCancelProcessing = () => {
    setProcessingCase(null);
    setProcessDetails('');
    setProcessAttachments([]);
  };

  // Pending Delivery (Hospital) workflow
  const handleOpenHospitalDeliveryModal = (caseId: string) => {
    setHospitalDeliveryCase(caseId);
  };

  const handleCancelHospitalDelivery = () => {
    setHospitalDeliveryCase(null);
    setHospitalDeliveryAttachments([]);
    setHospitalDeliveryComments('');
  };

  const handleOrderDelivered = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: hospitalDeliveryAttachments,
        comments: hospitalDeliveryComments
      };
      await updateCaseStatus(caseId, 'Pending Delivery (Hospital)', currentUser.id, JSON.stringify(additionalData));
      setHospitalDeliveryCase(null);
      setHospitalDeliveryAttachments([]);
      setHospitalDeliveryComments('');
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Order marked as pending delivery to hospital');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Pending Delivery to Hospital',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been delivered to hospital by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  // Delivered (Hospital) workflow
  const handleOrderReceived = (caseId: string) => {
    setReceivedCase(caseId);
    setReceivedDetails('');
    setReceivedImage('');
  };

  const handleSaveOrderReceived = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELIVERED_HOSPITAL)) {
      return;
    }
    if (!receivedDetails.trim()) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      
      // Convert single image to attachments array for standardization
      const attachments = [];
      if (receivedImage) {
        // Create a file object for the image
        const imageFile = {
          name: `delivery-image-${caseId}-${Date.now()}.png`,
          type: 'image/png',
          size: Math.round(receivedImage.length * 0.75), // Estimate size from base64 length
          data: receivedImage
        };
        attachments.push(JSON.stringify(imageFile));
      }
      
      const additionalData = {
        comments: receivedDetails,
        attachments: attachments
      };
      await updateCaseStatus(caseId, 'Delivered (Hospital)', currentUser.id, JSON.stringify(additionalData));
      setReceivedCase(null);
      setReceivedDetails('');
      setReceivedImage('');
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Order successfully marked as delivered to hospital');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Delivered at Hospital',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been received at hospital by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  // Case Completed workflow
  const handleCaseCompleted = (caseId: string) => {
    setCompletedCase(caseId);
    setAttachments([]);
    setOrderSummary('');
    setDoNumber('');
  };

  const handleSaveCaseCompleted = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.CASE_COMPLETED)) {
      return;
    }
    if (!orderSummary.trim() || !doNumber.trim()) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments,
        orderSummary,
        doNumber
      };
      await updateCaseStatus(caseId, 'Case Completed', currentUser.id, JSON.stringify(additionalData));
      setCompletedCase(null);
      setAttachments([]);
      setOrderSummary('');
      setDoNumber('');
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Case successfully marked as completed');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Case Completed',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been completed by ${currentUser.name} with DO#: ${doNumber}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  // Delivered (Office) workflow
  const handleOrderDeliveredOffice = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELIVERED_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      await updateCaseStatus(caseId, 'Delivered (Office)', currentUser.id);
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Order successfully delivered to office');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Delivered to Office',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been delivered to office by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  // To be billed workflow
  const handleToBeBilled = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      await updateCaseStatus(caseId, 'To be billed', currentUser.id);
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Case successfully marked as "To be billed"');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Case Ready for Billing',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} is now ready to be billed - updated by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  // Pending Delivery (Office) workflow handlers
  const handlePendingDeliveryOffice = (caseId: string) => {
    setPendingOfficeCase(caseId);
    setPendingOfficeAttachments([]);
    setPendingOfficeComments('');
  };

  const handleSavePendingOffice = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: pendingOfficeAttachments,
        comments: pendingOfficeComments
      };
      await updateCaseStatus(caseId, 'Pending Delivery (Office)', currentUser.id, JSON.stringify(additionalData));
      setPendingOfficeCase(null);
      setPendingOfficeAttachments([]);
      setPendingOfficeComments('');
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Case marked as pending delivery to office');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Pending Delivery to Office',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} is now pending delivery to office - updated by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const handleCancelPendingOffice = () => {
    setPendingOfficeCase(null);
    setPendingOfficeAttachments([]);
    setPendingOfficeComments('');
  };

  // Enhanced Office Delivery workflow handlers
  const handleOfficeDelivery = (caseId: string) => {
    setOfficeDeliveryCase(caseId);
    setOfficeDeliveryAttachments([]);
    setOfficeDeliveryComments('');
  };

  const handleSaveOfficeDelivery = async (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELIVERED_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: officeDeliveryAttachments,
        comments: officeDeliveryComments
      };
      await updateCaseStatus(caseId, 'Delivered (Office)', currentUser.id, JSON.stringify(additionalData));
      setOfficeDeliveryCase(null);
      setOfficeDeliveryAttachments([]);
      setOfficeDeliveryComments('');
      await loadCases();
      
      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      
      // Show success popup
      setSuccessMessage('Order successfully delivered to office');
      setShowSuccessPopup(true);
      
      // Add notification for status change
      addNotification({
        title: 'Delivered to Office',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been delivered to office by ${currentUser.name}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Failed to update case status:', error);
    }
  };

  const handleCancelOfficeDelivery = () => {
    setOfficeDeliveryCase(null);
    setOfficeDeliveryAttachments([]);
    setOfficeDeliveryComments('');
  };

  // Cancel case workflow
  const handleCancelCase = (caseId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return;
    }
    
    const caseItem = cases.find(c => c.id === caseId);
    const confirmMessage = `Are you sure you want to cancel case "${caseItem?.caseReferenceNumber}"?\n\nThis action will mark the case as cancelled and cannot be undone.`;
    
    showConfirm('Cancel Case', confirmMessage, async () => {
      try {
        await updateCaseStatus(caseId, 'Case Cancelled', currentUser.id, 'Case cancelled by user request');
        await loadCases();
        
        // Reset to page 1 and expand the updated case
        setCurrentPage(1);
        setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
        
        // Show success popup
        setSuccessMessage('Case successfully cancelled');
        setShowSuccessPopup(true);
        
        // Add notification for status change
        addNotification({
          title: 'Case Cancelled',
          message: `Case ${caseItem?.caseReferenceNumber || caseId} has been cancelled by ${currentUser.name}`,
          type: 'warning'
        });
      } catch (error) {
        console.error('Failed to cancel case:', error);
      }
    });
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
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_CASE)) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete case "${caseItem.caseReferenceNumber}"?\n\nCase Details:\n- Hospital: ${caseItem.hospital}\n- Procedure: ${caseItem.procedureType}\n- Status: ${caseItem.status}\n\nThis action cannot be undone.`;
    
    showConfirm('Delete Case', confirmMessage, async () => {
      try {
        // Use the proper storage service to delete from Supabase
        const { deleteSupabaseCase } = await import('../../utils/supabaseCaseService');
        await deleteSupabaseCase(caseId);
        
        // Fallback to localStorage if Supabase fails
        try {
          // Get all cases from localStorage
          const allCases = await getCases();
          // Filter out the case to delete
          const updatedCases = allCases.filter(c => c.id !== caseId);
          // Save back to localStorage
          localStorage.setItem('case-booking-cases', JSON.stringify(updatedCases));
        } catch (localStorageError) {
          console.error('localStorage fallback failed:', localStorageError);
        }
        
        // Reload cases to update the UI
        await loadCases();
        
        // Reset to page 1 (case was deleted, so no need to expand)
        setCurrentPage(1);
        
        // Add notification
        addNotification({
          title: 'Case Deleted',
          message: `Case ${caseItem.caseReferenceNumber} has been successfully deleted by ${currentUser.name}`,
          type: 'warning'
        });
        
        // Success handled by UI update
      } catch (error) {
        console.error('Delete failed:', error);
        // Show error notification
        addNotification({
          title: 'Delete Failed',
          message: `Failed to delete case ${caseItem.caseReferenceNumber}. Please try again.`,
          type: 'error'
        });
      }
    });
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
                    expandedAmendmentHistory={expandedAmendmentHistory}
                    amendingCase={amendingCase}
                    amendmentData={amendmentData}
                    processingCase={processingCase}
                    processDetails={processDetails}
                    processAttachments={processAttachments}
                    processComments={processComments}
                    deliveryCase={deliveryCase}
                    deliveryDetails={deliveryDetails}
                    hospitalDeliveryCase={hospitalDeliveryCase}
                    hospitalDeliveryAttachments={hospitalDeliveryAttachments}
                    hospitalDeliveryComments={hospitalDeliveryComments}
                    receivedCase={receivedCase}
                    receivedDetails={receivedDetails}
                    receivedImage={receivedImage}
                    completedCase={completedCase}
                    attachments={attachments}
                    orderSummary={orderSummary}
                    doNumber={doNumber}
                    pendingOfficeCase={pendingOfficeCase}
                    pendingOfficeAttachments={pendingOfficeAttachments}
                    pendingOfficeComments={pendingOfficeComments}
                    officeDeliveryCase={officeDeliveryCase}
                    officeDeliveryAttachments={officeDeliveryAttachments}
                    officeDeliveryComments={officeDeliveryComments}
                    onToggleExpansion={toggleCaseExpansion}
                    onToggleStatusHistory={toggleStatusHistoryExpansion}
                    onToggleAmendmentHistory={toggleAmendmentHistoryExpansion}
                    onStatusChange={handleStatusChange}
                    onAmendCase={handleAmendCase}
                    onSaveAmendment={handleSaveAmendment}
                    onCancelAmendment={handleCancelAmendment}
                    onOrderProcessed={handleOrderProcessed}
                    onSaveProcessDetails={handleSaveProcessDetails}
                    onCancelProcessing={handleCancelProcessing}
                    onOrderDelivered={handleOpenHospitalDeliveryModal}
                    onOrderReceived={handleOrderReceived}
                    onSaveOrderReceived={handleSaveOrderReceived}
                    onCancelReceived={handleCancelReceived}
                    onCaseCompleted={handleCaseCompleted}
                    onSaveCaseCompleted={handleSaveCaseCompleted}
                    onCancelCompleted={handleCancelCompleted}
                    onPendingDeliveryOffice={handlePendingDeliveryOffice}
                    onSavePendingOffice={handleSavePendingOffice}
                    onCancelPendingOffice={handleCancelPendingOffice}
                    onOfficeDelivery={handleOfficeDelivery}
                    onSaveOfficeDelivery={handleSaveOfficeDelivery}
                    onCancelOfficeDelivery={handleCancelOfficeDelivery}
                    onOrderDeliveredOffice={handleOrderDeliveredOffice}
                    onToBeBilled={handleToBeBilled}
                    onDeleteCase={handleDeleteCase}
                    onCancelCase={handleCancelCase}
                    onAttachmentUpload={handleAttachmentUpload}
                    onRemoveAttachment={removeAttachment}
                    onAmendmentDataChange={setAmendmentData}
                    onProcessDetailsChange={setProcessDetails}
                    onProcessAttachmentsChange={setProcessAttachments}
                    onProcessCommentsChange={setProcessComments}
                    onSaveHospitalDelivery={handleOrderDelivered}
                    onCancelHospitalDelivery={handleCancelHospitalDelivery}
                    onHospitalDeliveryAttachmentsChange={setHospitalDeliveryAttachments}
                    onHospitalDeliveryCommentsChange={setHospitalDeliveryComments}
                    onReceivedDetailsChange={setReceivedDetails}
                    onReceivedImageChange={setReceivedImage}
                    onOrderSummaryChange={setOrderSummary}
                    onDoNumberChange={setDoNumber}
                    onPendingOfficeAttachmentsChange={setPendingOfficeAttachments}
                    onPendingOfficeCommentsChange={setPendingOfficeComments}
                    onOfficeDeliveryAttachmentsChange={setOfficeDeliveryAttachments}
                    onOfficeDeliveryCommentsChange={setOfficeDeliveryComments}
                    onNavigateToPermissions={onNavigateToPermissions}
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
      
      <StatusChangeSuccessPopup
        message={successMessage}
        isVisible={showSuccessPopup}
        onClose={() => setShowSuccessPopup(false)}
      />
      
      <CustomModal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        actions={modal.type === 'confirm' ? [
          {
            label: 'Cancel',
            onClick: closeModal,
            style: 'secondary'
          },
          {
            label: 'Delete',
            onClick: modal.onConfirm || closeModal,
            style: 'danger'
          }
        ] : undefined}
      />
    </div>
  );
};

export default CasesList;