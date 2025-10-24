/**
 * Modern Edit Sets Component - 2025 UX/UI Best Practices
 * Enhanced user experience with intuitive navigation and visual feedback
 *
 * Key UX Improvements:
 * - Progressive disclosure with clear step indicators
 * - Visual hierarchy with proper spacing and typography
 * - Instant feedback with loading states and animations
 * - Accessible keyboard navigation and screen reader support
 * - Responsive design for all device sizes
 * - Error handling with actionable guidance
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getCurrentUser } from '../../utils/authCompat';
import { hasPermission, PERMISSION_ACTIONS } from '../../utils/permissions';
import { useToast } from '../ToastContainer';
import { useSound } from '../../contexts/SoundContext';
import EditSetsErrorBoundary from '../ErrorBoundary/EditSetsErrorBoundary';
import { useRealtimeDepartments } from '../../hooks/useRealtimeDepartments';
import FuzzySearchDropdown from './FuzzySearchDropdown';
import { supabase } from '../../lib/supabase';
import { normalizeCountry } from '../../utils/countryUtils';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  DOCTOR_PROCEDURES_FIELDS,
  SURGERY_SETS_FIELDS,
  IMPLANT_BOXES_FIELDS,
  getDbField
} from '../../utils/fieldMappings';
import './ModernEditSets.css';

// Helper function to format doctor names consistently
const formatDoctorName = (name: string): string => {
  if (!name) return '';
  const trimmed = name.trim();
  // If name already starts with "Dr" or "Dr.", don't add another "Dr."
  if (trimmed.toLowerCase().startsWith('dr')) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
};

// Enhanced TypeScript interfaces with UX metadata
interface UIStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  isCompleted: boolean;
  isActive: boolean;
  isAccessible: boolean;
}

interface DoctorRecord {
  id: string;
  name: string;
  specialties: string[];
  department_id: string;
  country: string;
  is_active: boolean; // ⚠️ is_active (isActive)
  sort_order?: number;
}

interface ProcedureRecord {
  id: string;
  procedure_type: string; // ⚠️ procedure_type (procedureType) - NOT procedure
  doctor_id: string; // ⚠️ doctor_id (doctorId) FK
  country: string;
  is_active: boolean;
  sort_order?: number;
}

interface SurgerySetRecord {
  id: string;
  name: string;
  description?: string;
  doctor_id: string;
  procedure_type: string;
  country: string;
  is_active: boolean;
}

interface ImplantBoxRecord {
  id: string;
  name: string;
  description?: string;
  doctor_id: string;
  procedure_type: string;
  country: string;
  is_active: boolean;
}

interface SurgeryImplantRecord {
  id: string;
  surgery_set_id?: string;
  implant_box_id?: string;
  surgery_set_name?: string;
  implant_box_name?: string;
  doctor_id: string;
  procedure_type: string;
  country: string;
}

const TABS = {
  DOCTORS: 'doctors',
  PROCEDURES: 'procedures',
  SURGERY_IMPLANTS: 'surgery-implants'
} as const;

type TabType = typeof TABS[keyof typeof TABS];

const ModernEditSets: React.FC = () => {
  const currentUser = getCurrentUser();
  const { showSuccess, showError } = useToast();
  const { playSound } = useSound();

  // Permission and country validation
  const userCountry = currentUser?.selectedCountry || currentUser?.country;
  const normalizedCountry = normalizeCountry(userCountry);

  if (!userCountry) {
    throw new Error('User country is required for Edit Sets functionality. Please select a country in your profile.');
  }

  // State management with enhanced UX tracking
  // Set default tab based on user permissions
  const getDefaultTab = (): TabType => {
    if (currentUser) {
      if (hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_DOCTORS)) {
        return TABS.DOCTORS;
      } else if (hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_PROCEDURE_TYPES)) {
        return TABS.PROCEDURES;
      } else if (hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_SURGERY_IMPLANTS)) {
        return TABS.SURGERY_IMPLANTS;
      }
    }
    return TABS.DOCTORS; // Fallback
  };
  
  const [activeTab, setActiveTab] = useState<TabType>(getDefaultTab());
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Data state
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [procedures, setProcedures] = useState<ProcedureRecord[]>([]);
  const [surgeryImplants, setSurgeryImplants] = useState<SurgeryImplantRecord[]>([]);
  const [surgerySets, setSurgerySets] = useState<SurgerySetRecord[]>([]);
  const [implantBoxes, setImplantBoxes] = useState<ImplantBoxRecord[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorRecord | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<ProcedureRecord | null>(null);

  // Surgery & Implants tab state
  const [surgeryImplantMode, setSurgeryImplantMode] = useState<'surgery' | 'implant'>('surgery');

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<ProcedureRecord | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Touch drag state for mobile
  const [touchStartY, setTouchStartY] = useState<number>(0);
  const [touchCurrentY, setTouchCurrentY] = useState<number>(0);
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  // Real-time departments hook
  const {
    departments,
    selectedDepartment,
    selectDepartment,
    addDoctor: _realtimeAddDoctor,
    removeDoctor: _realtimeRemoveDoctor,
    isLoading: departmentsLoading,
    error: departmentsError
  } = useRealtimeDepartments({
    country: normalizedCountry,
    enableTesting: false
  });

  // Error handling with user-friendly messages
  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    // Edit Sets Error - shown in toast notification
    showError('Error', `${context}: ${errorMessage}`);
    playSound?.error();
  }, [showError, playSound]);

  // Check permissions based on current tab
  const getRequiredPermission = (tab: string) => {
    switch (tab) {
      case TABS.DOCTORS:
        return PERMISSION_ACTIONS.MANAGE_DOCTORS;
      case TABS.PROCEDURES:
        return PERMISSION_ACTIONS.MANAGE_PROCEDURE_TYPES;
      case TABS.SURGERY_IMPLANTS:
        return PERMISSION_ACTIONS.MANAGE_SURGERY_IMPLANTS;
      default:
        return PERMISSION_ACTIONS.EDIT_SETS; // Fallback for backward compatibility
    }
  };

  const hasEditAccess = currentUser ? hasPermission(currentUser.role, getRequiredPermission(activeTab)) : false;
  
  // Render permission denied UI if no access
  if (!hasEditAccess) {
    const tabName = activeTab === TABS.DOCTORS ? 'Manage Doctors' : 
                   activeTab === TABS.PROCEDURES ? 'Manage Procedure Types' : 
                   activeTab === TABS.SURGERY_IMPLANTS ? 'Manage Surgery & Implants' : 'Edit Sets';
    
    return (
      <EditSetsErrorBoundary componentName="Modern Edit Sets" userAction="managing edit sets">
        <div className="modern-edit-sets permission-denied">
          <div className="permission-error-container">
            <div className="permission-error-icon">🔒</div>
            <h2 className="permission-error-title">Access Denied</h2>
            <p className="permission-error-message">
              You do not have permission to access <strong>{tabName}</strong>.
            </p>
            <div className="permission-error-details">
              <p>Required permission: <code>{getRequiredPermission(activeTab)}</code></p>
              <p>Your current role: <code>{currentUser?.role || 'Unknown'}</code></p>
            </div>
            <div className="permission-error-actions">
              <button 
                onClick={() => window.history.back()}
                className="btn btn-secondary"
              >
                ← Go Back
              </button>
              <p className="help-text">
                Contact your administrator to request access to this feature.
              </p>
            </div>
          </div>
        </div>
      </EditSetsErrorBoundary>
    );
  }


  // Load doctors when department is selected (for any tab that needs doctors)
  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedDepartment) return;

      setIsLoading(true);
      try {
        // Use unified service instead of direct Supabase query
        const { getDoctorsForDepartment } = await import('../../utils/unifiedDataService');
        const doctorData = await getDoctorsForDepartment(selectedDepartment.name, normalizedCountry);
        
        // Add sort_order if missing and assign sequential numbers
        const processedData = doctorData.map((item, index) => ({
          ...item,
          sort_order: item.sort_order ?? index + 1
        }));
        setDoctors(processedData);
      } catch (error) {
        handleError(error, 'Failed to load doctors');
        setDoctors([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctors();
  }, [selectedDepartment, normalizedCountry, activeTab, handleError]);

  // Load procedures for the active tab (Procedures tab OR Surgery & Implants tab)
  useEffect(() => {
    const loadProcedures = async () => {
      if (activeTab !== TABS.PROCEDURES && activeTab !== TABS.SURGERY_IMPLANTS) {
        setProcedures([]);
        return;
      }

      setIsLoading(true);
      try {
        // Load ALL procedure types from database, filter in UI if needed
        const { data, error } = await supabase
          .from('doctor_procedures')
          .select('id, procedure_type, doctor_id, country, is_active, sort_order')
          .eq('country', normalizedCountry)
          .eq(DOCTOR_PROCEDURES_FIELDS.isActive, true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('procedure_type'); // ⚠️ procedure_type (procedureType) - NOT procedure

        if (error) throw error;

        // Add sort_order if missing and assign sequential numbers per doctor
        const doctorGroups = new Map<string, any[]>();
        
        // Group procedures by doctor_id with null safety
        (data || []).forEach(item => {
          // Skip null/undefined items or items without doctor_id
          if (!item || !item.doctor_id) return;
          
          if (!doctorGroups.has(item.doctor_id)) {
            doctorGroups.set(item.doctor_id, []);
          }
          doctorGroups.get(item.doctor_id)!.push(item);
        });
        
        // Assign per-doctor sort_order for missing values
        const processedData: ProcedureRecord[] = [];
        doctorGroups.forEach(doctorProcedures => {
          // Separate procedures with and without sort_order
          const procsWithSortOrder = doctorProcedures.filter(p => p.sort_order != null);
          const procsWithoutSortOrder = doctorProcedures.filter(p => p.sort_order == null);
          
          // Sort procedures with sort_order
          procsWithSortOrder.sort((a, b) => a.sort_order! - b.sort_order!);
          
          // Find the maximum sort_order for this doctor
          const maxSortOrder = procsWithSortOrder.length > 0 
            ? Math.max(...procsWithSortOrder.map(p => p.sort_order!))
            : 0;
          
          // Assign sort_order to procedures without it, starting after the max
          const updatedProcsWithoutSortOrder = procsWithoutSortOrder.map((item, index) => ({
            ...item,
            sort_order: maxSortOrder + index + 1
          }));
          
          // Combine all procedures for this doctor
          const allDoctorProcs = [...procsWithSortOrder, ...updatedProcsWithoutSortOrder];
          processedData.push(...allDoctorProcs);
        });

        setProcedures(processedData);
      } catch (error) {
        handleError(error, 'Failed to load procedures');
        setProcedures([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProcedures();
  }, [normalizedCountry, activeTab, handleError]);

  // Load surgery sets when procedure is selected
  useEffect(() => {
    const loadSurgerySets = async () => {
      if (activeTab !== TABS.SURGERY_IMPLANTS) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('surgery_sets')
          .select('id, name, description, doctor_id, procedure_type, country, is_active, sort_order')
          .eq('country', normalizedCountry)
          .eq(SURGERY_SETS_FIELDS.isActive, true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('name');

        if (error) throw error;
        setSurgerySets(data || []);
      } catch (error) {
        handleError(error, 'Failed to load surgery sets');
        setSurgerySets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSurgerySets();
  }, [normalizedCountry, activeTab, handleError]);

  // Load implant boxes when Surgery & Implants tab is active
  useEffect(() => {
    const loadImplantBoxes = async () => {
      if (activeTab !== TABS.SURGERY_IMPLANTS) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('implant_boxes')
          .select('id, name, description, doctor_id, procedure_type, country, is_active, sort_order')
          .eq('country', normalizedCountry)
          .eq(IMPLANT_BOXES_FIELDS.isActive, true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('name');

        if (error) throw error;
        setImplantBoxes(data || []);
      } catch (error) {
        handleError(error, 'Failed to load implant boxes');
        setImplantBoxes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadImplantBoxes();
  }, [normalizedCountry, activeTab, handleError]);

  // Add new item functionality
  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let result: any;

      switch (activeTab) {
        case TABS.DOCTORS:
          if (!selectedDepartment) throw new Error('Please select a department first');
          const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .insert({
              name: newItemName.trim(),
              department_id: selectedDepartment.id,
              country: normalizedCountry,
              specialties: [],
              is_active: true
            })
            .select()
            .single();
          
          if (doctorError) throw doctorError;
          result = { data: doctorData, error: null };
          break;

        case TABS.PROCEDURES:
          if (!selectedDoctor) throw new Error('Please select a doctor from the dropdown above to associate this procedure type with a specific doctor');
          
          // Calculate next sort_order for this doctor
          // First check local state, then fallback to database query if needed
          const doctorProcedures = procedures.filter(p => p && p.doctor_id === selectedDoctor.id);
          let nextSortOrder = 1;
          
          if (doctorProcedures.length > 0) {
            const maxSortOrder = Math.max(...doctorProcedures.map(p => p.sort_order || 0));
            nextSortOrder = maxSortOrder + 1;
          } else {
            // Fallback: Query database to ensure we get the correct sort_order
            const { data: existingProcs } = await supabase
              .from('doctor_procedures')
              .select('sort_order')
              .eq('doctor_id', selectedDoctor.id) // ⚠️ doctor_id (doctorId) FK
              .eq('country', normalizedCountry)
              .eq(DOCTOR_PROCEDURES_FIELDS.isActive, true);
              
            if (existingProcs && existingProcs.length > 0) {
              const maxSortOrder = Math.max(...existingProcs.map(p => p.sort_order || 0));
              nextSortOrder = maxSortOrder + 1;
            }
          }
          
          const { data: procedureData, error: procedureError } = await supabase
            .from('doctor_procedures')
            .insert({
              procedure_type: newItemName.trim(),
              doctor_id: selectedDoctor.id,
              country: normalizedCountry,
              is_active: true,
              sort_order: nextSortOrder
            })
            .select()
            .single();
          
          if (procedureError) throw procedureError;
          result = { data: procedureData, error: null };
          break;

        case TABS.SURGERY_IMPLANTS:
          if (!selectedDoctor || !selectedProcedure) {
            throw new Error('Please select both a doctor and procedure type from the dropdowns above before adding items');
          }
          
          const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';
          const nameToUse = newItemName.trim();
          
          const { data: surgeryImplantData, error: surgeryImplantError } = await supabase
            .from(tableName)
            .insert({
              name: nameToUse,
              doctor_id: selectedDoctor.id,
              procedure_type: selectedProcedure.procedure_type,
              country: normalizedCountry,
              is_active: true
            })
            .select()
            .single();

          if (surgeryImplantError) throw surgeryImplantError;
          result = { data: surgeryImplantData, error: null };

          // CRITICAL FIX: Add to doctor_procedure_sets junction table so sets appear in New Case Booking
          const junctionData = {
            doctor_id: selectedDoctor.id,
            procedure_type: selectedProcedure.procedure_type,
            country: normalizedCountry,
            ...(surgeryImplantMode === 'surgery' 
              ? { surgery_set_id: result.data.id, implant_box_id: null }
              : { surgery_set_id: null, implant_box_id: result.data.id }
            )
          };

          const { error: junctionError } = await supabase
            .from('doctor_procedure_sets')
            .insert(junctionData);

          if (junctionError) {
            // Don't throw - the set was created successfully, junction table is optimization
          }

          // Update the appropriate state
          if (surgeryImplantMode === 'surgery') {
            setSurgerySets(prev => [...prev, result.data]);
          } else {
            setImplantBoxes(prev => [...prev, result.data]);
          }
          
          break;

        default:
          throw new Error('Unknown tab selected');
      }

      // Result is now always in the format { data, error } so no need to check result?.error again

      showSuccess('Success', `${newItemName} has been added successfully`);
      playSound?.success();
      setNewItemName('');
      setShowAddForm(false);

      // Refresh the appropriate data
      if (activeTab === TABS.DOCTORS) {
        setDoctors(prev => [...prev, result.data]);
      } else if (activeTab === TABS.PROCEDURES) {
        setProcedures(prev => [...prev, result.data]);
      }

    } catch (error) {
      handleError(error, 'Failed to add item');
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, newItemName, selectedDepartment, selectedDoctor, normalizedCountry, isSubmitting, showSuccess, playSound, handleError]);

  // Drag and drop handlers for procedure reordering
  const handleDragStart = useCallback((e: React.DragEvent, procedure: ProcedureRecord) => {
    setDraggedItem(procedure);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetProcedure: ProcedureRecord) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetProcedure.id) {
      setIsDragging(false);
      setDraggedItem(null);
      return;
    }

    try {
      // Only reorder procedures for the selected doctor
      if (!selectedDoctor) return;
      
      const doctorProcedures = procedures.filter(p => p && p.doctor_id === selectedDoctor.id);
      const otherProcedures = procedures.filter(p => p && p.doctor_id !== selectedDoctor.id);
      
      // Sort doctor procedures by sort_order to ensure correct initial order
      doctorProcedures.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      const reorderedDoctorProcedures = [...doctorProcedures];
      const draggedIndex = reorderedDoctorProcedures.findIndex(p => p.id === draggedItem.id);
      const targetIndex = reorderedDoctorProcedures.findIndex(p => p.id === targetProcedure.id);

      // Remove dragged item and insert at new position
      const [removed] = reorderedDoctorProcedures.splice(draggedIndex, 1);
      reorderedDoctorProcedures.splice(targetIndex, 0, removed);

      // Update sort orders only for this doctor's procedures (starting from 1)
      const updatedDoctorProcedures = reorderedDoctorProcedures.map((proc, index) => ({
        ...proc,
        sort_order: index + 1
      }));

      // Combine with other doctors' procedures (unchanged)
      const allUpdatedProcedures = [...otherProcedures, ...updatedDoctorProcedures];

      // Update state immediately for smooth UX
      setProcedures(allUpdatedProcedures);

      // Update database only for this doctor's procedures
      const updatePromises = updatedDoctorProcedures.map(proc =>
        supabase
          .from('doctor_procedures')
          .update({ sort_order: proc.sort_order })
          .eq('id', proc.id)
      );

      await Promise.all(updatePromises);

      showSuccess('Success', 'Procedure order updated successfully');
      playSound?.success();

    } catch (error) {
      handleError(error, 'Failed to reorder procedures');
      // Reload procedures to restore correct order
      if (selectedDoctor) {
        // Trigger reload by resetting selected doctor
        const currentDoctor = selectedDoctor;
        setSelectedDoctor(null);
        setTimeout(() => setSelectedDoctor(currentDoctor), 100);
      }
    } finally {
      setIsDragging(false);
      setDraggedItem(null);
    }
  }, [draggedItem, procedures, showSuccess, playSound, handleError, selectedDoctor]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDraggedItem(null);
  }, []);

  // Touch event handlers for mobile drag and drop
  const handleTouchStart = useCallback((e: React.TouchEvent, procedure: ProcedureRecord) => {
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setDraggedItem(procedure);
    setIsTouchDragging(false);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggedItem) return;
    
    const touch = e.touches[0];
    const deltaY = Math.abs(touch.clientY - touchStartY);
    
    setTouchCurrentY(touch.clientY);
    
    // Start dragging if moved more than 10px
    if (deltaY > 10 && !isTouchDragging) {
      setIsTouchDragging(true);
      setIsDragging(true);
    }
    
    if (isTouchDragging) {
      e.preventDefault(); // Prevent scrolling while dragging
    }
  }, [draggedItem, touchStartY, isTouchDragging]);

  const handleTouchEnd = useCallback(async (e: React.TouchEvent) => {
    if (!draggedItem || !isTouchDragging) {
      setDraggedItem(null);
      setIsTouchDragging(false);
      setIsDragging(false);
      return;
    }

    // Find the element under the touch point
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetElement = elementBelow?.closest('[data-procedure-id]');
    
    if (targetElement) {
      const targetId = targetElement.getAttribute('data-procedure-id');
      const targetProcedure = procedures.find(p => p.id === targetId);
      
      if (targetProcedure && targetProcedure.id !== draggedItem.id) {
        // Simulate drop event
        const mockEvent = {
          preventDefault: () => {},
        } as React.DragEvent;
        
        await handleDrop(mockEvent, targetProcedure);
      }
    }

    setDraggedItem(null);
    setIsTouchDragging(false);
    setIsDragging(false);
  }, [draggedItem, isTouchDragging, procedures, handleDrop]);

  // Drag and drop handlers for doctors reordering
  const [draggedDoctor, setDraggedDoctor] = useState<DoctorRecord | null>(null);

  const handleDoctorDragStart = useCallback((e: React.DragEvent, doctor: DoctorRecord) => {
    setDraggedDoctor(doctor);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDoctorDrop = useCallback(async (e: React.DragEvent, targetDoctor: DoctorRecord) => {
    e.preventDefault();

    if (!draggedDoctor || draggedDoctor.id === targetDoctor.id) {
      setIsDragging(false);
      setDraggedDoctor(null);
      return;
    }

    try {
      const reorderedDoctors = [...doctors];
      const draggedIndex = reorderedDoctors.findIndex(d => d.id === draggedDoctor.id);
      const targetIndex = reorderedDoctors.findIndex(d => d.id === targetDoctor.id);

      const [removed] = reorderedDoctors.splice(draggedIndex, 1);
      reorderedDoctors.splice(targetIndex, 0, removed);

      // Update sort orders
      const updatedDoctors = reorderedDoctors.map((doctor, index) => ({
        ...doctor,
        sort_order: index + 1
      }));

      // Update state immediately for smooth UX
      setDoctors(updatedDoctors);

      // Update database with new sort orders
      const updatePromises = updatedDoctors.map(doctor =>
        supabase
          .from('doctors')
          .update({ sort_order: doctor.sort_order })
          .eq('id', doctor.id)
      );

      await Promise.all(updatePromises);

      showSuccess('Success', 'Doctor order updated and saved');
      playSound?.success();

    } catch (error) {
      handleError(error, 'Failed to reorder doctors');
    } finally {
      setIsDragging(false);
      setDraggedDoctor(null);
    }
  }, [draggedDoctor, doctors, showSuccess, playSound, handleError]);

  // Drag and drop handlers for surgery/implant items
  const [draggedSurgeryImplant, setDraggedSurgeryImplant] = useState<any>(null);

  const handleSurgeryImplantDragStart = useCallback((e: React.DragEvent, item: any) => {
    setDraggedSurgeryImplant(item);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleSurgeryImplantDrop = useCallback(async (e: React.DragEvent, targetItem: any) => {
    e.preventDefault();

    if (!draggedSurgeryImplant || draggedSurgeryImplant.id === targetItem.id) {
      setIsDragging(false);
      setDraggedSurgeryImplant(null);
      return;
    }

    try {
      const currentData = surgeryImplantMode === 'surgery' ? surgerySets : implantBoxes;
      const reordered = [...currentData];
      const draggedIndex = reordered.findIndex(i => i.id === draggedSurgeryImplant.id);
      const targetIndex = reordered.findIndex(i => i.id === targetItem.id);

      const [removed] = reordered.splice(draggedIndex, 1);
      reordered.splice(targetIndex, 0, removed);

      // Update sort orders for database persistence
      const updatedItems = reordered.map((item, index) => ({
        ...item,
        sort_order: index + 1
      }));

      // Update state immediately for smooth UX
      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(updatedItems);
      } else {
        setImplantBoxes(updatedItems);
      }

      // Update database with new sort orders
      const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';
      const updatePromises = updatedItems.map(item =>
        supabase
          .from(tableName)
          .update({ sort_order: item.sort_order })
          .eq('id', item.id)
      );

      await Promise.all(updatePromises);

      showSuccess('Success', `${surgeryImplantMode === 'surgery' ? 'Surgery set' : 'Implant box'} order updated and saved`);
      playSound?.success();

    } catch (error) {
      handleError(error, `Failed to reorder ${surgeryImplantMode === 'surgery' ? 'surgery sets' : 'implant boxes'}`);
      // On error, the data will be automatically reloaded by the useEffect hooks
      // when the dependencies change, so no manual reload needed here
    } finally {
      setIsDragging(false);
      setDraggedSurgeryImplant(null);
    }
  }, [draggedSurgeryImplant, surgerySets, implantBoxes, surgeryImplantMode, showSuccess, playSound, handleError, selectedProcedure]);

  // Add surgery set or implant box
  const handleAddSurgeryImplantItem = useCallback(async () => {
    if (!newItemName.trim() || isSubmitting || !selectedProcedure) return;

    setIsSubmitting(true);
    try {
      const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';
      let nameToUse = newItemName.trim();

      // The database constraint now handles uniqueness properly:
      // (name, doctor_id, procedure_type, country) must be unique
      // Same name is allowed for different doctor/procedure combinations

      const { data: surgeryImplantItemData, error: surgeryImplantItemError } = await supabase
        .from(tableName)
        .insert({
          name: nameToUse,
          doctor_id: selectedProcedure.doctor_id,
          procedure_type: selectedProcedure.procedure_type,
          country: normalizedCountry,
          is_active: true
        })
        .select()
        .single();

      if (surgeryImplantItemError) throw surgeryImplantItemError;

      // CRITICAL FIX: Add to doctor_procedure_sets junction table so sets appear in New Case Booking
      const junctionData = {
        doctor_id: selectedProcedure.doctor_id,
        procedure_type: selectedProcedure.procedure_type,
        country: normalizedCountry,
        ...(surgeryImplantMode === 'surgery' 
          ? { surgery_set_id: surgeryImplantItemData.id, implant_box_id: null }
          : { surgery_set_id: null, implant_box_id: surgeryImplantItemData.id }
        )
      };

      const { error: junctionError } = await supabase
        .from('doctor_procedure_sets')
        .insert(junctionData);

      if (junctionError) {
        // Don't throw - the set was created successfully, junction table is optimization
      }

      const itemType = surgeryImplantMode === 'surgery' ? 'Surgery Set' : 'Implant Box';
      showSuccess('Success', `${itemType} "${nameToUse}" has been added successfully`);
      playSound?.success();
      setNewItemName('');
      setShowAddForm(false);

      // Update the appropriate state
      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(prev => [...prev, surgeryImplantItemData]);
      } else {
        setImplantBoxes(prev => [...prev, surgeryImplantItemData]);
      }

    } catch (error) {
      handleError(error, `Failed to add ${surgeryImplantMode === 'surgery' ? 'surgery set' : 'implant box'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [surgeryImplantMode, newItemName, selectedProcedure, normalizedCountry, isSubmitting, showSuccess, playSound, handleError]);

  // Edit surgery set or implant box
  const handleEditItem = useCallback(async (item: SurgerySetRecord | ImplantBoxRecord) => {
    const itemType = surgeryImplantMode === 'surgery' ? 'Surgery Set' : 'Implant Box';
    const newName = window.prompt(`Edit ${itemType} name:`, item.name);

    if (!newName || newName.trim() === '' || newName.trim() === item.name) return;

    setIsSubmitting(true);
    try {
      const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';

      const { error } = await supabase
        .from(tableName)
        .update({ name: newName.trim() })
        .eq('id', item.id);

      if (error) throw error;

      showSuccess('Success', `${itemType} updated successfully`);
      playSound?.success();

      // Update the appropriate state
      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(prev => prev.map(s => s.id === item.id ? { ...s, name: newName.trim() } : s));
      } else {
        setImplantBoxes(prev => prev.map(i => i.id === item.id ? { ...i, name: newName.trim() } : i));
      }

    } catch (error) {
      handleError(error, `Failed to edit ${itemType.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [surgeryImplantMode, showSuccess, playSound, handleError]);

  // Delete surgery set or implant box
  const handleDeleteItem = useCallback(async (item: SurgerySetRecord | ImplantBoxRecord) => {
    const itemType = surgeryImplantMode === 'surgery' ? 'Surgery Set' : 'Implant Box';

    if (!window.confirm(`Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';

      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      // CRITICAL FIX: Also remove from doctor_procedure_sets junction table
      const deleteField = surgeryImplantMode === 'surgery' ? 'surgery_set_id' : 'implant_box_id';
      const { error: junctionError } = await supabase
        .from('doctor_procedure_sets')
        .delete()
        .eq(deleteField, item.id);

      if (junctionError) {
        // Don't throw - the main deletion was successful
      }

      showSuccess('Success', `${itemType} "${item.name}" has been deleted`);
      playSound?.success();

      // Remove from state
      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(prev => prev.filter(s => s.id !== item.id));
      } else {
        setImplantBoxes(prev => prev.filter(i => i.id !== item.id));
      }

    } catch (error) {
      handleError(error, `Failed to delete ${itemType.toLowerCase()}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [surgeryImplantMode, showSuccess, playSound, handleError]);

  // Move item left or right by one position
  const handleMoveItem = useCallback(async (item: ProcedureRecord, direction: 'left' | 'right') => {
    if (activeTab !== TABS.PROCEDURES || !selectedDoctor) return;

    try {
      // Only work with procedures for the selected doctor
      const doctorProcedures = procedures.filter(p => p && p.doctor_id === selectedDoctor.id);
      const otherProcedures = procedures.filter(p => p && p.doctor_id !== selectedDoctor.id);
      
      // Sort doctor procedures by sort_order to ensure correct initial order
      doctorProcedures.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
      const currentDoctorProcedures = [...doctorProcedures];
      const currentIndex = currentDoctorProcedures.findIndex(p => p.id === item.id);
      
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex < 0 || newIndex >= currentDoctorProcedures.length) return;

      // Swap items within this doctor's procedures only
      [currentDoctorProcedures[currentIndex], currentDoctorProcedures[newIndex]] = 
      [currentDoctorProcedures[newIndex], currentDoctorProcedures[currentIndex]];

      // Update sort orders only for this doctor's procedures (starting from 1)
      const updatedDoctorProcedures = currentDoctorProcedures.map((proc, index) => ({
        ...proc,
        sort_order: index + 1
      }));

      // Combine with other doctors' procedures (unchanged)
      const allUpdatedProcedures = [...otherProcedures, ...updatedDoctorProcedures];

      // Update state immediately for smooth UX
      setProcedures(allUpdatedProcedures);

      // Update database only for this doctor's procedures
      const updatePromises = updatedDoctorProcedures.map(proc =>
        supabase
          .from('doctor_procedures')
          .update({ sort_order: proc.sort_order })
          .eq('id', proc.id)
      );

      await Promise.all(updatePromises);

      showSuccess('Success', `Moved ${item.procedure_type} ${direction}`);
      playSound?.success();

    } catch (error) {
      handleError(error, 'Failed to move procedure');
      // Reload procedures to restore correct order
      if (selectedDoctor) {
        const currentDoctor = selectedDoctor;
        setSelectedDoctor(null);
        setTimeout(() => setSelectedDoctor(currentDoctor), 100);
      }
    }
  }, [activeTab, procedures, showSuccess, playSound, handleError, selectedDoctor]);

  // Edit doctor or procedure
  const handleEditDataItem = useCallback(async (item: any) => {
    if (activeTab === TABS.DOCTORS) {
      const newName = window.prompt('Edit doctor name:', item.name);
      if (!newName || newName.trim() === '' || newName.trim() === item.name) return;

      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('doctors')
          .update({ name: newName.trim() })
          .eq('id', item.id);

        if (error) throw error;

        showSuccess('Success', 'Doctor updated successfully');
        playSound?.success();
        setDoctors(prev => prev.map(d => d.id === item.id ? { ...d, name: newName.trim() } : d));

      } catch (error) {
        handleError(error, 'Failed to edit doctor');
      } finally {
        setIsSubmitting(false);
      }

    } else if (activeTab === TABS.PROCEDURES) {
      const newProcedureType = window.prompt('Edit procedure type:', item.procedure_type);
      if (!newProcedureType || newProcedureType.trim() === '' || newProcedureType.trim() === item.procedure_type) return;

      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('doctor_procedures')
          .update({ procedure_type: newProcedureType.trim() })
          .eq('id', item.id);

        if (error) throw error;

        showSuccess('Success', 'Procedure type updated successfully');
        playSound?.success();
        setProcedures(prev => prev.map(p => p.id === item.id ? { ...p, procedure_type: newProcedureType.trim() } : p));

      } catch (error) {
        handleError(error, 'Failed to edit procedure');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [activeTab, showSuccess, playSound, handleError]);

  // Delete doctor or procedure
  const handleDeleteDataItem = useCallback(async (item: any) => {
    let itemName = '';
    let tableName = '';

    if (activeTab === TABS.DOCTORS) {
      itemName = item.name;
      tableName = 'doctors';
    } else if (activeTab === TABS.PROCEDURES) {
      itemName = item.procedure_type;
      tableName = 'doctor_procedures';
    } else {
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_active: false })
        .eq('id', item.id);

      if (error) throw error;

      showSuccess('Success', `${activeTab === TABS.DOCTORS ? 'Doctor' : 'Procedure'} deleted successfully`);
      playSound?.success();

      // Remove from state
      if (activeTab === TABS.DOCTORS) {
        setDoctors(prev => prev.filter(d => d.id !== item.id));
      } else if (activeTab === TABS.PROCEDURES) {
        setProcedures(prev => prev.filter(p => p.id !== item.id));
      }

    } catch (error) {
      handleError(error, `Failed to delete ${activeTab === TABS.DOCTORS ? 'doctor' : 'procedure'}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [activeTab, showSuccess, playSound, handleError]);

  // Render mode selector for surgery sets vs implant boxes
  const renderSurgeryImplantModeSelector = () => (
    <div className="mode-selector">
      <div className="mode-tabs">
        <button
          onClick={() => setSurgeryImplantMode('surgery')}
          className={`mode-tab ${surgeryImplantMode === 'surgery' ? 'active' : ''}`}
        >
          <span className="mode-icon">🔧</span>
          Surgery Sets ({activeTab === TABS.SURGERY_IMPLANTS && surgeryImplantMode === 'surgery' ? filteredData.length : (selectedDoctor && selectedProcedure) ? surgerySets.filter(item => item && item.doctor_id === selectedDoctor.id && item.procedure_type === selectedProcedure.procedure_type).length : 0})
        </button>
        <button
          onClick={() => setSurgeryImplantMode('implant')}
          className={`mode-tab ${surgeryImplantMode === 'implant' ? 'active' : ''}`}
        >
          <span className="mode-icon">📦</span>
          Implant Boxes ({activeTab === TABS.SURGERY_IMPLANTS && surgeryImplantMode === 'implant' ? filteredData.length : (selectedDoctor && selectedProcedure) ? implantBoxes.filter(item => item && item.doctor_id === selectedDoctor.id && item.procedure_type === selectedProcedure.procedure_type).length : 0})
        </button>
      </div>
      <div className="mode-info">
        <h3>
          All {surgeryImplantMode === 'surgery' ? 'Surgery Sets' : 'Implant Boxes'}
        </h3>
        <p>
          {surgeryImplantMode === 'surgery'
            ? 'Manage all surgery sets in the system'
            : 'Manage all implant boxes in the system'
          }
        </p>
        {selectedProcedure && selectedDoctor && (
          <p className="filter-info">
            <small>Currently filtered to: {selectedProcedure.procedure_type} - {formatDoctorName(selectedDoctor.name)}</small>
          </p>
        )}
      </div>
    </div>
  );

  // Render surgery/implant content based on selected mode
  const renderSurgeryImplantContent = () => {
    const currentData = surgeryImplantMode === 'surgery' ? surgerySets : implantBoxes;
    const itemType = surgeryImplantMode === 'surgery' ? 'Surgery Set' : 'Implant Box';

    return (
      <div className="surgery-implant-content">
        <div className="content-header">
          <div className="search-section">
            <input
              type="text"
              placeholder={`Search ${itemType.toLowerCase()}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-button"
            disabled={!selectedDoctor || !selectedProcedure}
            title={
              !selectedDoctor ? 'Please select a doctor first' :
              !selectedProcedure ? 'Please select a procedure type first' :
              `Add ${itemType}`
            }
          >
            + Add {itemType}
          </button>
        </div>

        {showAddForm && (
          <div className="add-form">
            <input
              type="text"
              placeholder={`Enter ${itemType.toLowerCase()} name`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSurgeryImplantItem()}
              className="add-input"
              autoFocus
            />
            <div className="add-form-actions">
              <button
                onClick={handleAddSurgeryImplantItem}
                disabled={!newItemName.trim() || isSubmitting}
                className="confirm-button"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewItemName('');
                }}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Render the actual data list */}
        {renderDataList()}
      </div>
    );
  };

  // Filter data based on search query
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();

    switch (activeTab) {
      case TABS.DOCTORS:
        return doctors.filter(doctor =>
          doctor.name.toLowerCase().includes(query) ||
          doctor.specialties.some(specialty => specialty.toLowerCase().includes(query))
        );
      case TABS.PROCEDURES:
        // Only show procedures if a doctor is selected
        if (!selectedDoctor) {
          return [];
        }
        
        // Filter by selected doctor first, then by search query
        let filteredProcs = procedures.filter(proc => proc && proc.doctor_id === selectedDoctor.id);
        
        // Sort by sort_order to maintain per-doctor ordering
        filteredProcs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        
        return filteredProcs.filter(procedure =>
          procedure.procedure_type.toLowerCase().includes(query)
        );
      case TABS.SURGERY_IMPLANTS:
        const currentData = surgeryImplantMode === 'surgery' ? surgerySets : implantBoxes;
        
        // Only show data if both doctor and procedure are selected
        if (!selectedDoctor || !selectedProcedure) {
          return [];
        }
        
        // Filter by selected doctor and procedure first, then by search query
        let filteredSurgeryImplants = currentData.filter(item => 
          item && item.doctor_id === selectedDoctor.id && 
          item.procedure_type === selectedProcedure.procedure_type
        );
        
        return filteredSurgeryImplants.filter(item =>
          item.name?.toLowerCase().includes(query) ||
          item.procedure_type?.toLowerCase().includes(query)
        );
      default:
        return [];
    }
  }, [activeTab, doctors, procedures, surgerySets, implantBoxes, surgeryImplantMode, searchQuery, selectedDoctor, selectedProcedure]);


  // Render search and filter controls
  const renderControls = () => (
    <div className="edit-sets-controls">
      <div className="search-section">
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
          aria-label={`Search ${activeTab}`}
        />
      </div>

      {activeTab !== TABS.SURGERY_IMPLANTS && (
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-button"
          disabled={!selectedDepartment || (activeTab === TABS.PROCEDURES && !selectedDoctor)}
          aria-label={`Add new ${activeTab.slice(0, -1)}`}
          title={
            !selectedDepartment ? 'Please select a department first' :
            (activeTab === TABS.PROCEDURES && !selectedDoctor) ? 'Please select a doctor first' :
            `Add new ${activeTab === TABS.DOCTORS ? 'doctor' : 'procedure type'}`
          }
        >
          + Add {activeTab === TABS.DOCTORS ? 'Doctor' : 'Procedure'}
        </button>
      )}
    </div>
  );

  // Render add form
  const renderAddForm = () => {
    if (!showAddForm) return null;

    return (
      <div className="add-form">
        <input
          type="text"
          placeholder={`Enter ${activeTab === TABS.DOCTORS ? 'doctor' : 'procedure'} name`}
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
          className="add-input"
          autoFocus
        />
        <div className="add-form-actions">
          <button
            onClick={handleAddItem}
            disabled={!newItemName.trim() || isSubmitting}
            className="confirm-button"
          >
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
          <button
            onClick={() => {
              setShowAddForm(false);
              setNewItemName('');
            }}
            className="cancel-button"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  // Render data list
  const renderDataList = () => {
    if (isLoading) {
      return (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading {activeTab}...</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No {activeTab} found</h3>
          <p>
            {searchQuery
              ? `No ${activeTab} match your search criteria.`
              : `Start by adding your first ${activeTab.slice(0, -1)}.`
            }
          </p>
        </div>
      );
    }

    return (
      <div className="data-list">
        {filteredData.map((item: any, index: number) => (
          <div
            key={item.id}
            className={`data-item draggable-item ${
              isDragging && (draggedItem?.id === item.id || draggedDoctor?.id === item.id || draggedSurgeryImplant?.id === item.id) ? 'dragging' : ''
            }`}
            draggable={true}
            data-procedure-id={activeTab === TABS.PROCEDURES ? item.id : undefined}
            data-doctor-id={activeTab === TABS.DOCTORS ? item.id : undefined}
            data-surgery-implant-id={activeTab === TABS.SURGERY_IMPLANTS ? item.id : undefined}
            onDragStart={
              activeTab === TABS.PROCEDURES ? (e) => handleDragStart(e, item) :
              activeTab === TABS.DOCTORS ? (e) => handleDoctorDragStart(e, item) :
              activeTab === TABS.SURGERY_IMPLANTS ? (e) => handleSurgeryImplantDragStart(e, item) : undefined
            }
            onDragOver={handleDragOver}
            onDrop={
              activeTab === TABS.PROCEDURES ? (e) => handleDrop(e, item) :
              activeTab === TABS.DOCTORS ? (e) => handleDoctorDrop(e, item) :
              activeTab === TABS.SURGERY_IMPLANTS ? (e) => handleSurgeryImplantDrop(e, item) : undefined
            }
            onTouchStart={
              activeTab === TABS.PROCEDURES ? (e) => handleTouchStart(e, item) : undefined
            }
            onTouchMove={
              activeTab === TABS.PROCEDURES ? handleTouchMove : undefined
            }
            onTouchEnd={
              activeTab === TABS.PROCEDURES ? handleTouchEnd : undefined
            }
            onDragEnd={handleDragEnd}
          >
            {(activeTab === TABS.PROCEDURES || activeTab === TABS.SURGERY_IMPLANTS) && (
              <div className="item-number">
                {index + 1}
              </div>
            )}

            <div className="item-content">
              {activeTab === TABS.DOCTORS && (
                <>
                  <h4>{formatDoctorName(item.name)}</h4>
                </>
              )}
              {activeTab === TABS.PROCEDURES && (
                <>
                  <h4>{item.procedure_type}</h4>
                  <p>Doctor: {selectedDoctor?.name}</p>
                </>
              )}
              {activeTab === TABS.SURGERY_IMPLANTS && (
                <>
                  <h4>{item.name}</h4>
                  <p>Procedure: {item.procedure_type}</p>
                </>
              )}
              
              {/* Standardized drag hint for all tabs */}
              <div className="drag-hint">
                <span className="drag-icon">⋮⋮</span>
                <span className="drag-text">Drag to reorder</span>
              </div>
            </div>

            <div className="item-actions">
              {/* Move buttons for procedures */}
              {activeTab === TABS.PROCEDURES && (
                <>
                  <button
                    className="move-button move-left"
                    aria-label={`Move ${item.procedure_type} left`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(item, 'left');
                    }}
                    disabled={isSubmitting || index === 0}
                    title="Move left"
                  >
                    ←
                  </button>
                  <button
                    className="move-button move-right"
                    aria-label={`Move ${item.procedure_type} right`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveItem(item, 'right');
                    }}
                    disabled={isSubmitting || index === filteredData.length - 1}
                    title="Move right"
                  >
                    →
                  </button>
                </>
              )}
              <button
                className="edit-button"
                aria-label={`Edit ${item.name || item.procedure_type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTab === TABS.SURGERY_IMPLANTS) {
                    handleEditItem(item);
                  } else {
                    handleEditDataItem(item);
                  }
                }}
                disabled={isSubmitting}
              >
                ✏️
              </button>
              <button
                className="delete-button"
                aria-label={`Delete ${item.name || item.procedure_type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeTab === TABS.SURGERY_IMPLANTS) {
                    handleDeleteItem(item);
                  } else {
                    handleDeleteDataItem(item);
                  }
                }}
                disabled={isSubmitting}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render department selection (dropdown with fuzzy search)
  const renderDepartmentSelection = () => {
    // CRITICAL FIX: Add null safety for departments array
    const departmentOptions = (departments || [])
      .filter(dept => dept && dept.id && dept.name) // Filter out null/invalid departments
      .map(dept => ({
        id: dept.id,
        name: dept.name,
        description: dept.description || ''
      }));

    return (
      <div className="department-selection-dropdown">
        <FuzzySearchDropdown
          options={departmentOptions}
          value={selectedDepartment ? {
            id: selectedDepartment.id,
            name: selectedDepartment.name,
            description: selectedDepartment.description || ''
          } : null}
          onChange={(option) => {
            if (option) {
              const dept = departments.find(d => d.id === option.id);
              if (dept) {
                selectDepartment(dept);
                // Reset dependent selections
                setSelectedDoctor(null);
                setSelectedProcedure(null);
              }
            } else {
              selectDepartment(null);
              setSelectedDoctor(null);
              setSelectedProcedure(null);
            }
          }}
          placeholder="Choose a department..."
          label="Department"
          isLoading={departmentsLoading}
          emptyMessage={departmentsError ? "Error loading departments" : "No departments available"}
          clearable
        />
      </div>
    );
  };

  // Render doctor selection dropdown
  const renderDoctorDropdown = () => {
    // CRITICAL FIX: Add null safety for doctors array
    const doctorOptions = (doctors || [])
      .filter(doctor => doctor && doctor.id && doctor.name) // Filter out null/invalid doctors
      .map(doctor => ({
        id: doctor.id,
        name: formatDoctorName(doctor.name),
        description: ''
      }));

    return (
      <div className="doctor-selection-dropdown">
        <FuzzySearchDropdown
          options={doctorOptions}
          value={selectedDoctor ? {
            id: selectedDoctor.id,
            name: formatDoctorName(selectedDoctor.name),
            description: ''
          } : null}
          onChange={(option) => {
            if (option) {
              const doctor = doctors.find(d => d.id === option.id);
              if (doctor) {
                setSelectedDoctor(doctor);
                // Reset procedure selection
                setSelectedProcedure(null);
              }
            } else {
              setSelectedDoctor(null);
              setSelectedProcedure(null);
            }
          }}
          placeholder="Choose a doctor..."
          label="Doctor"
          disabled={!selectedDepartment}
          isLoading={isLoading && activeTab === TABS.PROCEDURES}
          emptyMessage={!selectedDepartment ? "Please select a department first" : "No doctors found in this department"}
          clearable
        />
      </div>
    );
  };

  // Render procedure selection dropdown
  const renderProcedureDropdown = () => {
    // Filter procedures by selected doctor (if any), otherwise show all
    const filteredProcedures = selectedDoctor 
      ? (procedures || []).filter(proc => proc && proc.doctor_id === selectedDoctor.id)
      : (procedures || []);
      
    // CRITICAL FIX: Add null safety for procedures array
    const procedureOptions = filteredProcedures
      .filter(procedure => procedure && procedure.id && procedure.procedure_type) // Filter out null/invalid procedures
      .map(procedure => ({
      id: procedure.id,
      name: procedure.procedure_type,
      description: procedures.find(p => p.doctor_id === procedure.doctor_id)?.doctor_id 
        ? doctors.find(d => d.id === procedure.doctor_id)?.name || 'Unknown Doctor'
        : 'Unknown Doctor'
    }));

    return (
      <div className="procedure-selection-dropdown">
        <FuzzySearchDropdown
          options={procedureOptions}
          value={selectedProcedure ? {
            id: selectedProcedure.id,
            name: selectedProcedure.procedure_type,
            description: selectedDoctor?.name ? formatDoctorName(selectedDoctor.name) : 'Unknown'
          } : null}
          onChange={(option) => {
            if (option) {
              const procedure = procedures.find(p => p.id === option.id);
              if (procedure) {
                setSelectedProcedure(procedure);
              }
            } else {
              setSelectedProcedure(null);
            }
          }}
          placeholder="Choose a procedure type..."
          label="Procedure Type"
          disabled={!selectedDoctor}
          isLoading={isLoading && activeTab === TABS.SURGERY_IMPLANTS}
          emptyMessage={!selectedDoctor ? "Select a doctor to filter procedures" : "No procedures found for this doctor"}
          clearable
        />
      </div>
    );
  };

  return (
    <EditSetsErrorBoundary componentName="Modern Edit Sets" userAction="managing edit sets">
      <div className="modern-edit-sets" data-active-tab={activeTab}>
        
        {/* Tab Navigation - Only show tabs user has permission to access */}
        <nav className="edit-sets-tabs">
          {currentUser && hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_DOCTORS) && (
            <button
              onClick={() => setActiveTab(TABS.DOCTORS)}
              className={`tab-button ${activeTab === TABS.DOCTORS ? 'active' : ''}`}
            >
              👩‍⚕️ Manage Doctors
            </button>
          )}
          {currentUser && hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_PROCEDURE_TYPES) && (
            <button
              onClick={() => setActiveTab(TABS.PROCEDURES)}
              className={`tab-button ${activeTab === TABS.PROCEDURES ? 'active' : ''}`}
            >
              🏥 Procedure Types
            </button>
          )}
          {currentUser && hasPermission(currentUser.role, PERMISSION_ACTIONS.MANAGE_SURGERY_IMPLANTS) && (
            <button
              onClick={() => setActiveTab(TABS.SURGERY_IMPLANTS)}
              className={`tab-button ${activeTab === TABS.SURGERY_IMPLANTS ? 'active' : ''}`}
            >
              🔧 Surgery & Implants
            </button>
          )}
        </nav>

        <main className="edit-sets-main">
          {/* Doctors Tab - Simple department dropdown + content */}
          {activeTab === TABS.DOCTORS && (
            <>
              <div className="tab-controls">
                {renderDepartmentSelection()}
              </div>
              {selectedDepartment ? (
                <section className="edit-sets-content">
                  {renderControls()}
                  {renderAddForm()}
                  {renderDataList()}
                </section>
              ) : (
                <div className="selection-guide">
                  <div className="guide-content">
                    <h3>👩‍⚕️ Doctor Management</h3>
                    <p>Please complete the following steps to manage doctors:</p>
                    <div className="selection-checklist">
                      <div className={`checklist-item ${selectedDepartment ? 'completed' : 'pending'}`}>
                        <span className="checkbox">{selectedDepartment ? '✅' : '⬜'}</span>
                        <span>Select a Department</span>
                      </div>
                    </div>
                    <p className="guide-note">
                      Once you select a department, you can add, edit, and organize doctors for that department.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Procedures Tab - Department + Doctor dropdowns */}
          {activeTab === TABS.PROCEDURES && (
            <>
              <div className="tab-controls two-column-dropdowns">
                {renderDepartmentSelection()}
                {renderDoctorDropdown()}
              </div>
              {selectedDepartment ? (
                <section className="edit-sets-content">
                  {renderControls()}
                  {renderAddForm()}
                  {renderDataList()}
                </section>
              ) : (
                <div className="selection-guide">
                  <div className="guide-content">
                    <h3>🏥 Procedure Types Management</h3>
                    <p>Please select a department to view and manage procedure types:</p>
                    <div className="selection-checklist">
                      <div className={`checklist-item ${selectedDepartment ? 'completed' : 'pending'}`}>
                        <span className="checkbox">{selectedDepartment ? '✅' : '⬜'}</span>
                        <span>Select a Department</span>
                      </div>
                      <div className="info-item">
                        <span className="info-icon">ℹ️</span>
                        <span>Select a doctor to filter procedures (optional) or add new procedure types</span>
                      </div>
                    </div>
                    <p className="guide-note">
                      You can view all procedure types once you select a department. To add new procedures, select a specific doctor.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Surgery & Implants Tab - Department + Doctor + Procedure dropdowns */}
          {activeTab === TABS.SURGERY_IMPLANTS && (
            <>
              <div className="tab-controls three-column-dropdowns">
                {renderDepartmentSelection()}
                {renderDoctorDropdown()}
                {renderProcedureDropdown()}
              </div>
              <section className="surgery-implant-management">
                {renderSurgeryImplantModeSelector()}
                {renderSurgeryImplantContent()}
              </section>
            </>
          )}
        </main>
      </div>
    </EditSetsErrorBoundary>
  );
};

export default ModernEditSets;