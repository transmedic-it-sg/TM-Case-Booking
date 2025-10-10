/**
 * ⚠️ CRITICAL: Uses comprehensive field mappings to prevent database field naming issues
 * 
 * FIELD MAPPING RULES:
 * - Database fields: snake_case (e.g., date_of_surgery, case_booking_id)
 * - TypeScript interfaces: camelCase (e.g., dateOfSurgery, caseBookingId)
 * - ALWAYS use fieldMappings.ts utility instead of hardcoded field names
 * 
 * NEVER use: case_date → USE: date_of_surgery
 * NEVER use: procedure → USE: procedure_type
 * NEVER use: caseId → USE: case_booking_id
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { CaseBooking, FilterOptions, CaseStatus } from '../../types';
import { CASE_STATUSES } from '../../constants/statuses';
import { getCurrentUserSync } from '../../utils/auth';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useNotifications } from '../../contexts/NotificationContext';
import { useRealtimeCases } from '../../hooks/useRealtimeCases';
import { useRealtime } from '../RealtimeProvider';
import { CasesListProps } from './types';
import CasesFilter from './CasesFilter';
import CaseCard from './CaseCard';
import StatusChangeSuccessPopup from '../StatusChangeSuccessPopup';
import CustomModal from '../CustomModal';
import AmendmentForm from '../CaseCard/AmendmentForm';
import { useModal } from '../../hooks/useModal';
import { normalizeCountry } from '../../utils/countryUtils';
import { amendCase, processCaseOrder } from '../../utils/realTimeStorage'; // Using real-time storage instead
import StatusLegend from '../StatusLegend';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../../utils/fieldMappings';

const CasesList: React.FC<CasesListProps> = ({ onProcessCase, currentUser, highlightedCaseId, onClearHighlight, onNavigateToPermissions }) => {
  const { addNotification } = useNotifications();
  const { modal, closeModal, showConfirm, showConfirmWithCustomButtons } = useModal();
  const amendmentFormRef = useRef<HTMLDivElement>(null);

  // REAL-TIME CASES HOOK - Always fresh data, no cache issues, comprehensive testing
  const {
    cases,
    isLoading,
    refreshCases,
    updateCaseStatus,
    deleteCase,
    validateComponent,
    getTestingReport,
    isMutating
  } = useRealtimeCases({
    enableRealTime: true,
    enableTesting: false,
    filters: {
      country: currentUser?.selectedCountry,
    }
  });

  // Real-time connection status - prioritize cases connection for this component
  const { overallConnected, casesConnected, forceRefreshAll } = useRealtime();
  const isConnected = casesConnected || overallConnected;
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
  const [salesApprovalCase, setSalesApprovalCase] = useState<string | null>(null);
  const [salesApprovalAttachments, setSalesApprovalAttachments] = useState<string[]>([]);
  const [salesApprovalComments, setSalesApprovalComments] = useState('');

  // Filter cases function - moved inside useEffect to avoid infinite loops
  const filterCasesLocally = useCallback((casesToFilter: CaseBooking[], filterOptions: FilterOptions, userRole?: string) => {
    let filtered = casesToFilter;

    // Driver role filtering - only show delivery-related cases
    if (userRole === 'driver') {
      const deliveryStatuses = [
        'Pending Delivery (Hospital)',
        'Delivered (Hospital)',
        'Pending Delivery (Office)',
        'Delivered (Office)'
      ];

      filtered = filtered.filter(caseItem =>
        deliveryStatuses.includes(caseItem.status)
      );
    }

    // Apply search filter
    if (filterOptions.search) {
      const searchTerm = filterOptions.search.toLowerCase();
      filtered = filtered.filter(caseItem =>
        caseItem.caseReferenceNumber.toLowerCase().includes(searchTerm) ||
        caseItem.hospital.toLowerCase().includes(searchTerm) ||
        caseItem.doctorName?.toLowerCase().includes(searchTerm) ||
        caseItem.procedureType.toLowerCase().includes(searchTerm) ||
        caseItem.procedureName.toLowerCase().includes(searchTerm) ||
        caseItem.submittedBy.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    if (filterOptions.status) {
      filtered = filtered.filter(caseItem => caseItem.status === filterOptions.status);
    }

    // Apply submitter filter
    if (filterOptions.submitter) {
      filtered = filtered.filter(caseItem => caseItem.submittedBy === filterOptions.submitter);
    }

    // Apply hospital filter
    if (filterOptions.hospital) {
      filtered = filtered.filter(caseItem => caseItem.hospital === filterOptions.hospital);
    }

    // Apply country filter
    if (filterOptions.country) {
      filtered = filtered.filter(caseItem => caseItem.country === filterOptions.country);
    }

    // Apply date range filter
    if (filterOptions.dateFrom) {
      filtered = filtered.filter(caseItem => caseItem.dateOfSurgery >= filterOptions.dateFrom!);
    }

    if (filterOptions.dateTo) {
      filtered = filtered.filter(caseItem => caseItem.dateOfSurgery <= filterOptions.dateTo!);
    }

    return filtered;
  }, []); // No dependencies needed since we're using string literals
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
    // Cases are automatically loaded by useRealtimeCases hook (live data)
    // Update available options when cases change
    if (cases.length > 0) {
      const uniqueSubmitters = Array.from(new Set(cases.map(caseItem => caseItem.submittedBy)))
        .filter(submitter => submitter && submitter.trim())
        .sort();
      setAvailableSubmitters(uniqueSubmitters);

      const uniqueHospitals = Array.from(new Set(cases.map(caseItem => caseItem.hospital)))
        .filter(hospital => hospital && hospital.trim())
        .sort();
      setAvailableHospitals(uniqueHospitals);
    }
  }, [cases]);

  // Auto-apply filters for Driver role - only once when component mounts
  useEffect(() => {
    const currentUser = getCurrentUserSync();
    if (currentUser?.role === 'driver') {
      // Auto-apply delivery status filters for drivers
      // Set the first delivery status as default filter to show driver-relevant cases
      const defaultFilters = {
        status: CASE_STATUSES.PENDING_DELIVERY_HOSPITAL as CaseStatus
      };

      setFilters(defaultFilters);
      setTempFilters(defaultFilters);
    }
  }, []); // Run only once on mount

  // Use useMemo to calculate filtered cases without causing re-renders
  const filteredCases = useMemo(() => {
    const currentUser = getCurrentUserSync();
    let filteredResults = filterCasesLocally(cases, filters, currentUser?.role);

    // Admin users see ALL cases without country/department restrictions
    if (currentUser?.role === 'admin') {
      // Admin sees everything - no additional filtering
      return filteredResults;
    }

    // Non-admin users: Apply country and department restrictions
    if (currentUser) {
      // Country-based filtering for non-admin users
      if (currentUser.countries && currentUser.countries.length > 0) {
        // Normalize user's country names and filter cases by full country names
        const userCountries = currentUser.countries.map(country => normalizeCountry(country));
        filteredResults = filteredResults.filter(caseItem =>
          userCountries.includes(normalizeCountry(caseItem.country))
        );
      }

      // Department-based filtering for non-admin users (excluding Operations Managers who have broader access)
      const hasFullAccess = currentUser && (
        currentUser.role === 'operations-manager' ||
        currentUser.role === 'it'
      );

      if (currentUser.departments && currentUser.departments.length > 0 && !hasFullAccess) {
        // Clean department names - remove country prefixes like "Singapore:", "Malaysia:"
        const cleanDepartmentName = (department: string) => {
          return department.replace(/^[A-Za-z\s]+:/, '').trim();
        };

        const userDepartments = currentUser.departments.map(cleanDepartmentName);

        filteredResults = filteredResults.filter(caseItem =>
          userDepartments.includes(cleanDepartmentName(caseItem.department))
        );
      }
    }

    return filteredResults;
  }, [cases, filters, filterCasesLocally]); // Calculate whenever dependencies change

  // Handle highlighted case from calendar
  useEffect(() => {
    if (highlightedCaseId) {
      // Use a timeout for DOM manipulation and pagination
      const timeoutId = setTimeout(() => {
        // Find which page the highlighted case is on
        const caseIndex = cases.findIndex(c => c.id === highlightedCaseId);
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
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [highlightedCaseId, onClearHighlight, casesPerPage, cases]); // Depends on cases, not filteredCases

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
    const isMobile = window.innerWidth <= 1366;

    setExpandedCases(prev => {
      const newSet = new Set(prev);
      const isCurrentlyExpanded = newSet.has(caseId);

      if (isMobile) {
        // Mobile: Only allow one case to be expanded at a time (accordion behavior)
        if (isCurrentlyExpanded) {
          newSet.delete(caseId);
        } else {
          newSet.clear(); // Close all other expanded cases
          newSet.add(caseId);
        }
      } else {
        // Desktop: Allow multiple cases to be expanded
        if (isCurrentlyExpanded) {
          newSet.delete(caseId);
        } else {
          newSet.add(caseId);
        }
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
    const currentUser = getCurrentUserSync();
    if (!currentUser) return;

    const caseItem = cases.find(c => c.id === caseId);
    await updateCaseStatus(caseId, newStatus);
    refreshCases();

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
    // Prevent multiple clicks from opening multiple amendment forms
    if (amendingCase) {
      return;
    }
    
    // Set the amending case
    setAmendingCase(caseItem.id);
    setAmendmentData({
      hospital: caseItem.hospital,
      department: caseItem.department,
      dateOfSurgery: caseItem.dateOfSurgery,
      procedureType: caseItem.procedureType,
      procedureName: caseItem.procedureName,
      doctorName: caseItem.doctorName,
      timeOfProcedure: caseItem.timeOfProcedure,
      specialInstruction: caseItem.specialInstruction,
      amendmentReason: ''
    });
    
    // Scroll to the amendment form after a brief delay
    setTimeout(() => {
      if (amendmentFormRef.current) {
        amendmentFormRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleSaveAmendment = async (amendmentFormData: any) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser || !amendingCase) return;

    try {
      // Extract caseId from amendmentFormData if provided, otherwise use amendingCase
      const caseId = amendmentFormData.caseId || amendingCase;
      const { caseId: _, ...amendments } = amendmentFormData; // Remove caseId from amendments

      const caseItem = cases.find(c => c.id === caseId);

      // Validate that amendment reason is provided
      if (!amendments.amendmentReason || !amendments.amendmentReason.trim()) {
        throw new Error('Amendment reason is required');
      }

      await amendCase(caseId, amendments); // Real-time amendCase handles user automatically

      setAmendingCase(null);
      setAmendmentData({});
      refreshCases();

      // Reset to page 1 and expand the updated case AND amendment history
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));
      setExpandedAmendmentHistory(prev => new Set([...Array.from(prev), caseId]));

      // Show success popup
      setSuccessMessage('Case amended successfully! Check the Amendment History section below.');
      setShowSuccessPopup(true);

      // Add notification for amendment
      addNotification({
        title: 'Case Amended',
        message: `Case ${caseItem?.caseReferenceNumber || caseId} has been successfully amended by ${currentUser.name}`,
        type: 'success'
      }, 'case-amended', caseItem?.country, caseItem?.department);

      // Add audit log
      const { auditCaseAmended } = await import('../../utils/auditService');
      const changes = Object.keys(amendments).filter(key => amendments[key as keyof typeof amendments] && key !== 'amendmentReason');
      await auditCaseAmended(
        currentUser.name,
        currentUser.id,
        currentUser.role,
        caseItem?.caseReferenceNumber || amendingCase,
        changes,
        caseItem?.country,
        caseItem?.department
      );
    } catch (error) {
      // Failed to amend case
      // Add error notification with specific messages
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.message.includes('Amendment reason is required')) {
          errorMessage = 'Amendment reason is required. Please provide a reason for this change.';
        } else if (error.message.includes('already been amended')) {
          errorMessage = 'This case has already been amended and cannot be amended again (unless you are an admin).';
        } else {
          errorMessage = error.message;
        }
      }

      addNotification({
        title: 'Amendment Failed',
        message: `Failed to amend case: ${errorMessage}`,
        type: 'error'
      });
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

    const currentUser = getCurrentUserSync();
    if (!currentUser) {
      return;
    }

    try {
      const caseItem = cases.find(c => c.id === caseId);
      // Use the specific processCaseOrder function for order processing - include attachments
      await processCaseOrder(caseId, currentUser.id, processDetails, processAttachments);
      setProcessingCase(null);
      setProcessDetails('');
      setProcessAttachments([]);
      refreshCases();

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
      // Failed to update case status
    }
  };

  const handleCancelProcessing = () => {
    setProcessingCase(null);
    setProcessDetails('');
    setProcessAttachments([]);
  };

  // Sales Approval workflow
  const handleSalesApproval = (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.SALES_APPROVAL)) {
      return;
    }
    // Show the Sales Approval form
    setSalesApprovalCase(caseId);
    setSalesApprovalComments('');
    setSalesApprovalAttachments([]);
  };

  const handleSaveSalesApproval = async (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.SALES_APPROVAL)) {
      return;
    }

    try {
      // Prepare status update details
      const updateDetails = {
        salesApprovalComments: salesApprovalComments.trim(),
        attachments: salesApprovalAttachments,
        processedBy: currentUser.name,
        processedAt: new Date().toISOString()
      };

      // Use real-time hook for instant UI updates
      await updateCaseStatus(caseId, CASE_STATUSES.SALES_APPROVAL, JSON.stringify(updateDetails));

      // Reset form state
      setSalesApprovalCase(null);
      setSalesApprovalComments('');
      setSalesApprovalAttachments([]);

      // Reset to page 1 and expand the updated case
      setCurrentPage(1);
      setExpandedCases(prev => new Set([...Array.from(prev), caseId]));

      // Show success popup
      setSuccessMessage('Case successfully submitted for Sales Approval');
      setShowSuccessPopup(true);

      // Add notification for status change
      addNotification({
        title: 'Sales Approval',
        message: `Case submitted for sales approval`,
        type: 'success'
      });

      // Email notifications are handled automatically by the Email Notification Rules system
    } catch (error) {
      // Failed to update case status to Sales Approval
      addNotification({
        title: 'Error',
        message: 'Failed to submit case for sales approval',
        type: 'error'
      });
    }
  };

  const handleCancelSalesApproval = () => {
    setSalesApprovalCase(null);
    setSalesApprovalComments('');
    setSalesApprovalAttachments([]);
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
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.PENDING_DELIVERY_HOSPITAL)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: hospitalDeliveryAttachments,
        comments: hospitalDeliveryComments
      };
      await updateCaseStatus(caseId, 'Pending Delivery (Hospital)', JSON.stringify(additionalData));
      setHospitalDeliveryCase(null);
      setHospitalDeliveryAttachments([]);
      setHospitalDeliveryComments('');
      refreshCases();

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
      // Failed to update case status
    }
  };

  // Delivered (Hospital) workflow
  const handleOrderReceived = (caseId: string) => {
    setReceivedCase(caseId);
    setReceivedDetails('');
    setReceivedImage('');
  };

  const handleSaveOrderReceived = async (caseId: string) => {
    const currentUser = getCurrentUserSync();
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
      await updateCaseStatus(caseId, 'Delivered (Hospital)', JSON.stringify(additionalData));
      setReceivedCase(null);
      setReceivedDetails('');
      setReceivedImage('');
      refreshCases();

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
      // Failed to update case status
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
    const currentUser = getCurrentUserSync();
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
      await updateCaseStatus(caseId, 'Case Completed', JSON.stringify(additionalData));
      setCompletedCase(null);
      setAttachments([]);
      setOrderSummary('');
      setDoNumber('');
      refreshCases();

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
      // Failed to update case status
    }
  };

  // Delivered (Office) workflow
  const handleOrderDeliveredOffice = async (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELIVERED_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      await updateCaseStatus(caseId, 'Delivered (Office)');
      refreshCases();

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
      // Failed to update case status
    }
  };

  // To be billed workflow
  const handleToBeBilled = async (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      await updateCaseStatus(caseId, 'To be billed');
      refreshCases();

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
      // Failed to update case status
    }
  };

  // Pending Delivery (Office) workflow handlers
  const handlePendingDeliveryOffice = (caseId: string) => {
    setPendingOfficeCase(caseId);
    setPendingOfficeAttachments([]);
    setPendingOfficeComments('');
  };

  const handleSavePendingOffice = async (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.PENDING_DELIVERY_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: pendingOfficeAttachments,
        comments: pendingOfficeComments
      };
      await updateCaseStatus(caseId, 'Pending Delivery (Office)', JSON.stringify(additionalData));
      setPendingOfficeCase(null);
      setPendingOfficeAttachments([]);
      setPendingOfficeComments('');
      refreshCases();

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
      // Failed to update case status
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
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELIVERED_OFFICE)) {
      return;
    }
    try {
      const caseItem = cases.find(c => c.id === caseId);
      const additionalData = {
        attachments: officeDeliveryAttachments,
        comments: officeDeliveryComments
      };
      // Use real-time hook for instant UI updates
      await updateCaseStatus(caseId, 'Delivered (Office)', JSON.stringify(additionalData));

      setOfficeDeliveryCase(null);
      setOfficeDeliveryAttachments([]);
      setOfficeDeliveryComments('');

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
      // Failed to update case status
    }
  };

  const handleCancelOfficeDelivery = () => {
    setOfficeDeliveryCase(null);
    setOfficeDeliveryAttachments([]);
    setOfficeDeliveryComments('');
  };

  // Cancel case workflow
  const handleCancelCase = (caseId: string) => {
    const currentUser = getCurrentUserSync();
    if (!currentUser) {
      return;
    }

    const caseItem = cases.find(c => c.id === caseId);
    const confirmMessage = `Are you sure you want to cancel case "${caseItem?.caseReferenceNumber}"?\n\nThis action will mark the case as cancelled and cannot be undone.`;

    showConfirmWithCustomButtons('Cancel Case', confirmMessage, async () => {
      try {
        await updateCaseStatus(caseId, 'Case Cancelled', 'Case cancelled by user request');
        refreshCases();

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
        // Failed to cancel case
      }
    }, 'Cancel Case');
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
    const currentUser = getCurrentUserSync();
    if (!currentUser || !hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_CASE)) {
      return;
    }

    const confirmMessage = `Are you sure you want to delete case "${caseItem.caseReferenceNumber}"?\n\nCase Details:\n- Hospital: ${caseItem.hospital}\n- Procedure: ${caseItem.procedureType}\n- Status: ${caseItem.status}\n\nThis action cannot be undone.`;

    showConfirm('Delete Case', confirmMessage, async () => {
      try {
        // Use the deleteCase hook which handles database deletion with localStorage fallback
        const success = await deleteCase(caseId);

        if (success) {
          // Reset to page 1 (case was deleted, so no need to expand)
          setCurrentPage(1);

          // Add notification
          addNotification({
            title: 'Case Deleted',
            message: `Case ${caseItem.caseReferenceNumber} has been successfully deleted by ${currentUser.name}`,
            type: 'warning'
          });

          // Show success popup
          setSuccessMessage(`Case ${caseItem.caseReferenceNumber} has been successfully deleted`);
          setShowSuccessPopup(true);
        }
      } catch (error) {
        // Delete failed
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
    <div className="cases-list" data-testid="cases-list">
      <div className="cases-header">
        <h2>All Submitted Cases</h2>
        <div className="header-controls">
          {/* Real-time connection status indicator */}
          <div className={`realtime-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? 'Live Data' : 'Reconnecting...'}
          </div>

          {/* Real-time refresh button */}
          <button
            onClick={() => {
              if (isConnected) {refreshCases(); // Use real-time hook refresh
              } else {forceRefreshAll(); // Emergency cache clear
              }
            }}
            className="btn btn-outline-secondary btn-md refresh-button"
            title={isConnected ? 'Fetch latest data from database' : 'Force refresh all data and clear cache'}
            disabled={isMutating || isLoading}
          >
            {isMutating || isLoading ? '⏳ Loading...' :
             isConnected ? '↻ Refresh' : '⚠️ Force Refresh'}
          </button>

          {/* Status Color Legend - moved from main navigation */}
          <StatusLegend />

        </div>
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
                    onCancelAmendment={() => setAmendingCase(null)}
                    onOrderProcessed={handleOrderProcessed}
                    onSaveProcessDetails={handleSaveProcessDetails}
                    onCancelProcessing={handleCancelProcessing}
                    salesApprovalCase={salesApprovalCase}
                    salesApprovalAttachments={salesApprovalAttachments}
                    salesApprovalComments={salesApprovalComments}
                    onSalesApproval={handleSalesApproval}
                    onSaveSalesApproval={handleSaveSalesApproval}
                    onCancelSalesApproval={handleCancelSalesApproval}
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
                    onSalesApprovalAttachmentsChange={setSalesApprovalAttachments}
                    onSalesApprovalCommentsChange={setSalesApprovalComments}
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
            label: modal.confirmLabel || 'Delete',
            onClick: modal.onConfirm || closeModal,
            style: 'danger'
          }
        ] : undefined}
      />

      {/* Amendment Form Modal */}
      {amendingCase && (() => {
        const caseToAmend = cases.find(c => c.id === amendingCase);
        if (!caseToAmend) {
          // Case not found, close the amendment modal
          // Case not found, closing amendment modal
          setAmendingCase(null);
          setAmendmentData({});
          return null;
        }
        return (
          <div ref={amendmentFormRef}>
            <AmendmentForm
              caseItem={caseToAmend}
              amendmentData={amendmentData}
              onSave={handleSaveAmendment}
              onCancel={handleCancelAmendment}
            />
          </div>
        );
      })()}
    </div>
  );
};

export default CasesList;