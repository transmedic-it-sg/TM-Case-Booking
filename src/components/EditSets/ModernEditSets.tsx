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
import './ModernEditSets.css';

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
  is_active: boolean;
}

interface ProcedureRecord {
  id: string;
  procedure_type: string;
  doctor_id: string;
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

  const hasEditAccess = currentUser ? hasPermission(currentUser.role, PERMISSION_ACTIONS.EDIT_SETS) : false;
  if (!hasEditAccess) {
    throw new Error('You do not have permission to access Edit Sets. Please contact your administrator.');
  }

  // State management with enhanced UX tracking
  const [activeTab, setActiveTab] = useState<TabType>(TABS.DOCTORS);
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

  // Real-time departments hook
  const {
    departments,
    selectedDepartment,
    selectDepartment,
    addDoctor: _realtimeAddDoctor, // eslint-disable-line @typescript-eslint/no-unused-vars
    removeDoctor: _realtimeRemoveDoctor, // eslint-disable-line @typescript-eslint/no-unused-vars
    isLoading: departmentsLoading,
    error: departmentsError
  } = useRealtimeDepartments({
    country: normalizedCountry,
    enableTesting: false
  });

  // Error handling with user-friendly messages
  const handleError = useCallback((error: unknown, context: string) => {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error(`Edit Sets Error [${context}]:`, error);
    showError('Error', `${context}: ${errorMessage}`);
    playSound?.error();
  }, [showError, playSound]);

  // Progress tracking for better UX - All tabs are always accessible
  const steps: UIStep[] = useMemo(() => [
    {
      id: TABS.DOCTORS,
      title: 'Manage Doctors',
      description: 'Add, edit, and organize doctors by department',
      icon: '👩‍⚕️',
      isCompleted: doctors.length > 0,
      isActive: activeTab === TABS.DOCTORS,
      isAccessible: true
    },
    {
      id: TABS.PROCEDURES,
      title: 'Procedure Types',
      description: 'Define procedures for each doctor',
      icon: '🏥',
      isCompleted: procedures.length > 0,
      isActive: activeTab === TABS.PROCEDURES,
      isAccessible: true // Always accessible
    },
    {
      id: TABS.SURGERY_IMPLANTS,
      title: 'Surgery & Implants',
      description: 'Configure surgery sets and implant boxes',
      icon: '🔧',
      isCompleted: surgerySets.length > 0 || implantBoxes.length > 0,
      isActive: activeTab === TABS.SURGERY_IMPLANTS,
      isAccessible: true // Always accessible
    }
  ], [activeTab, doctors.length, procedures.length, surgerySets.length, implantBoxes.length]);

  // Load doctors when department is selected
  useEffect(() => {
    const loadDoctors = async () => {
      if (!selectedDepartment || activeTab !== TABS.DOCTORS) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('doctors')
          .select('id, name, specialties, department_id, country, is_active')
          .eq('department_id', selectedDepartment.id)
          .eq('country', normalizedCountry)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;
        setDoctors(data || []);
      } catch (error) {
        handleError(error, 'Failed to load doctors');
        setDoctors([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDoctors();
  }, [selectedDepartment, normalizedCountry, activeTab, handleError]);

  // Load procedures when doctor is selected
  useEffect(() => {
    const loadProcedures = async () => {
      if (!selectedDoctor || activeTab !== TABS.PROCEDURES) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('doctor_procedures')
          .select('id, procedure_type, doctor_id, country, is_active, sort_order')
          .eq('doctor_id', selectedDoctor.id)
          .eq('country', normalizedCountry)
          .eq('is_active', true)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('procedure_type');

        if (error) throw error;

        // Add sort_order if missing and assign sequential numbers
        const processedData = (data || []).map((item, index) => ({
          ...item,
          sort_order: item.sort_order ?? index + 1
        }));

        setProcedures(processedData);
      } catch (error) {
        handleError(error, 'Failed to load procedures');
        setProcedures([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProcedures();
  }, [selectedDoctor, normalizedCountry, activeTab, handleError]);

  // Load surgery sets when procedure is selected
  useEffect(() => {
    const loadSurgerySets = async () => {
      if (!selectedProcedure || activeTab !== TABS.SURGERY_IMPLANTS) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('surgery_sets')
          .select('id, name, description, doctor_id, procedure_type, country, is_active')
          .eq('doctor_id', selectedProcedure.doctor_id)
          .eq('procedure_type', selectedProcedure.procedure_type)
          .eq('country', normalizedCountry)
          .eq('is_active', true)
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
  }, [selectedProcedure, normalizedCountry, activeTab, handleError]);

  // Load implant boxes when procedure is selected
  useEffect(() => {
    const loadImplantBoxes = async () => {
      if (!selectedProcedure || activeTab !== TABS.SURGERY_IMPLANTS) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('implant_boxes')
          .select('id, name, description, doctor_id, procedure_type, country, is_active')
          .eq('doctor_id', selectedProcedure.doctor_id)
          .eq('procedure_type', selectedProcedure.procedure_type)
          .eq('country', normalizedCountry)
          .eq('is_active', true)
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
  }, [selectedProcedure, normalizedCountry, activeTab, handleError]);

  // Add new item functionality
  const handleAddItem = useCallback(async () => {
    if (!newItemName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let result: any;

      switch (activeTab) {
        case TABS.DOCTORS:
          if (!selectedDepartment) throw new Error('Please select a department first');
          result = await supabase
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
          break;

        case TABS.PROCEDURES:
          if (!selectedDoctor) throw new Error('Please select a doctor first');
          result = await supabase
            .from('doctor_procedures')
            .insert({
              procedure_type: newItemName.trim(),
              doctor_id: selectedDoctor.id,
              country: normalizedCountry,
              is_active: true
            })
            .select()
            .single();
          break;

        case TABS.SURGERY_IMPLANTS:
          throw new Error('Surgery sets and implant boxes must be selected from existing items');

        default:
          throw new Error('Unknown tab selected');
      }

      if (result?.error) throw result.error;

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
      const reorderedProcedures = [...procedures];
      const draggedIndex = reorderedProcedures.findIndex(p => p.id === draggedItem.id);
      const targetIndex = reorderedProcedures.findIndex(p => p.id === targetProcedure.id);

      // Remove dragged item and insert at new position
      const [removed] = reorderedProcedures.splice(draggedIndex, 1);
      reorderedProcedures.splice(targetIndex, 0, removed);

      // Update sort orders
      const updatedProcedures = reorderedProcedures.map((proc, index) => ({
        ...proc,
        sort_order: index + 1
      }));

      // Update state immediately for smooth UX
      setProcedures(updatedProcedures);

      // Update database
      const updatePromises = updatedProcedures.map(proc =>
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

      setDoctors(reorderedDoctors);

      showSuccess('Success', 'Doctor order updated');
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

      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(reordered);
      } else {
        setImplantBoxes(reordered);
      }

      showSuccess('Success', `${surgeryImplantMode === 'surgery' ? 'Surgery set' : 'Implant box'} order updated`);
      playSound?.success();

    } catch (error) {
      handleError(error, `Failed to reorder ${surgeryImplantMode === 'surgery' ? 'surgery sets' : 'implant boxes'}`);
    } finally {
      setIsDragging(false);
      setDraggedSurgeryImplant(null);
    }
  }, [draggedSurgeryImplant, surgerySets, implantBoxes, surgeryImplantMode, showSuccess, playSound, handleError]);

  // Add surgery set or implant box
  const handleAddSurgeryImplantItem = useCallback(async () => {
    if (!newItemName.trim() || isSubmitting || !selectedProcedure) return;

    setIsSubmitting(true);
    try {
      const tableName = surgeryImplantMode === 'surgery' ? 'surgery_sets' : 'implant_boxes';

      const result = await supabase
        .from(tableName)
        .insert({
          name: newItemName.trim(),
          doctor_id: selectedProcedure.doctor_id,
          procedure_type: selectedProcedure.procedure_type,
          country: normalizedCountry,
          is_active: true
        })
        .select()
        .single();

      if (result?.error) throw result.error;

      const itemType = surgeryImplantMode === 'surgery' ? 'Surgery Set' : 'Implant Box';
      showSuccess('Success', `${itemType} "${newItemName}" has been added successfully`);
      playSound?.success();
      setNewItemName('');
      setShowAddForm(false);

      // Update the appropriate state
      if (surgeryImplantMode === 'surgery') {
        setSurgerySets(prev => [...prev, result.data]);
      } else {
        setImplantBoxes(prev => [...prev, result.data]);
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
          Surgery Sets ({surgerySets.length})
        </button>
        <button
          onClick={() => setSurgeryImplantMode('implant')}
          className={`mode-tab ${surgeryImplantMode === 'implant' ? 'active' : ''}`}
        >
          <span className="mode-icon">📦</span>
          Implant Boxes ({implantBoxes.length})
        </button>
      </div>
      <div className="mode-info">
        <h3>
          {selectedProcedure?.procedure_type} - {selectedDoctor?.name ? `Dr. ${selectedDoctor.name}` : 'No doctor'}
        </h3>
        <p>
          {surgeryImplantMode === 'surgery'
            ? 'Manage surgery sets for this procedure'
            : 'Manage implant boxes for this procedure'
          }
        </p>
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
            disabled={!selectedProcedure}
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

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading {itemType.toLowerCase()}s...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{surgeryImplantMode === 'surgery' ? '🔧' : '📦'}</div>
            <h3>No {itemType}s found</h3>
            <p>Start by adding your first {itemType.toLowerCase()}.</p>
          </div>
        ) : (
          <div className="data-list">
            {currentData.filter((item: any) =>
              item.name.toLowerCase().includes(searchQuery.toLowerCase())
            ).map((item: any) => (
              <div
                key={item.id}
                className={`data-item surgery-implant-item draggable-item ${
                  isDragging && draggedSurgeryImplant?.id === item.id ? 'dragging' : ''
                }`}
                draggable={true}
                onDragStart={(e) => handleSurgeryImplantDragStart(e, item)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleSurgeryImplantDrop(e, item)}
                onDragEnd={handleDragEnd}
              >
                <div className="item-content">
                  <h4>{item.name}</h4>
                  <p>{item.description || 'No description'}</p>
                  <div className="item-meta">
                    <span className="item-type">{itemType}</span>
                    <span className="item-procedure">{selectedProcedure?.procedure_type}</span>
                  </div>
                  <div className="drag-hint">
                    <span className="drag-icon">⋮⋮</span>
                    <span className="drag-text">Drag to reorder</span>
                  </div>
                </div>
                <div className="item-actions">
                  <button
                    className="edit-button"
                    aria-label={`Edit ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditItem(item);
                    }}
                    disabled={isSubmitting}
                  >
                    ✏️
                  </button>
                  <button
                    className="delete-button"
                    aria-label={`Delete ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(item);
                    }}
                    disabled={isSubmitting}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
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
        return procedures.filter(procedure =>
          procedure.procedure_type.toLowerCase().includes(query)
        );
      case TABS.SURGERY_IMPLANTS:
        return surgeryImplants.filter(item =>
          (item.surgery_set_name?.toLowerCase().includes(query)) ||
          (item.implant_box_name?.toLowerCase().includes(query))
        );
      default:
        return [];
    }
  }, [activeTab, doctors, procedures, surgeryImplants, searchQuery]);

  // Render step indicator
  const renderStepIndicator = () => (
    <div className="edit-sets-steps">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={`step ${step.isActive ? 'active' : ''} ${step.isCompleted ? 'completed' : ''} ${!step.isAccessible ? 'disabled' : ''}`}
          onClick={() => step.isAccessible && setActiveTab(step.id as TabType)}
          role="button"
          tabIndex={step.isAccessible ? 0 : -1}
          aria-label={`Step ${index + 1}: ${step.title}`}
        >
          <div className="step-icon">{step.icon}</div>
          <div className="step-content">
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
          {step.isCompleted && <div className="step-check">✓</div>}
        </div>
      ))}
    </div>
  );

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
            className={`data-item ${
              (activeTab === TABS.PROCEDURES || activeTab === TABS.DOCTORS) ? 'draggable-item' : ''
            } ${
              isDragging && (draggedItem?.id === item.id || draggedDoctor?.id === item.id) ? 'dragging' : ''
            }`}
            draggable={activeTab === TABS.PROCEDURES || activeTab === TABS.DOCTORS}
            onDragStart={
              activeTab === TABS.PROCEDURES ? (e) => handleDragStart(e, item) :
              activeTab === TABS.DOCTORS ? (e) => handleDoctorDragStart(e, item) : undefined
            }
            onDragOver={
              activeTab === TABS.PROCEDURES || activeTab === TABS.DOCTORS ? handleDragOver : undefined
            }
            onDrop={
              activeTab === TABS.PROCEDURES ? (e) => handleDrop(e, item) :
              activeTab === TABS.DOCTORS ? (e) => handleDoctorDrop(e, item) : undefined
            }
            onDragEnd={handleDragEnd}
          >
            {activeTab === TABS.PROCEDURES && (
              <div className="item-number">
                {item.sort_order || index + 1}
              </div>
            )}

            <div className="item-content">
              {activeTab === TABS.DOCTORS && (
                <>
                  <h4>Dr. {item.name}</h4>
                  <div className="drag-hint">
                    <span className="drag-icon">⋮⋮</span>
                    <span className="drag-text">Drag to reorder</span>
                  </div>
                </>
              )}
              {activeTab === TABS.PROCEDURES && (
                <>
                  <h4>{item.procedure_type}</h4>
                  <p>Doctor: {selectedDoctor?.name}</p>
                  {activeTab === TABS.PROCEDURES && (
                    <div className="drag-hint">
                      <span className="drag-icon">⋮⋮</span>
                      <span className="drag-text">Drag to reorder</span>
                    </div>
                  )}
                </>
              )}
              {activeTab === TABS.SURGERY_IMPLANTS && (
                <>
                  {item.surgery_set_name && <h4>Surgery Set: {item.surgery_set_name}</h4>}
                  {item.implant_box_name && <h4>Implant Box: {item.implant_box_name}</h4>}
                  <p>Procedure: {item.procedure_type}</p>
                </>
              )}
            </div>

            <div className="item-actions">
              <button
                className="edit-button"
                aria-label={`Edit ${item.name || item.procedure_type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditDataItem(item);
                }}
                disabled={isSubmitting || activeTab === TABS.SURGERY_IMPLANTS}
              >
                ✏️
              </button>
              <button
                className="delete-button"
                aria-label={`Delete ${item.name || item.procedure_type}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteDataItem(item);
                }}
                disabled={isSubmitting || activeTab === TABS.SURGERY_IMPLANTS}
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
    const departmentOptions = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      description: dept.description || 'No description'
    }));

    return (
      <div className="department-selection-dropdown">
        <FuzzySearchDropdown
          options={departmentOptions}
          value={selectedDepartment ? {
            id: selectedDepartment.id,
            name: selectedDepartment.name,
            description: selectedDepartment.description || 'No description'
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
    const doctorOptions = doctors.map(doctor => ({
      id: doctor.id,
      name: doctor.name ? `Dr. ${doctor.name}` : doctor.name,
      description: ''
    }));

    return (
      <div className="doctor-selection-dropdown">
        <FuzzySearchDropdown
          options={doctorOptions}
          value={selectedDoctor ? {
            id: selectedDoctor.id,
            name: selectedDoctor.name ? `Dr. ${selectedDoctor.name}` : selectedDoctor.name,
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
    const procedureOptions = procedures.map(procedure => ({
      id: procedure.id,
      name: procedure.procedure_type,
      description: selectedDoctor?.name ? `Dr. ${selectedDoctor.name}` : 'Unknown'
    }));

    return (
      <div className="procedure-selection-dropdown">
        <FuzzySearchDropdown
          options={procedureOptions}
          value={selectedProcedure ? {
            id: selectedProcedure.id,
            name: selectedProcedure.procedure_type,
            description: selectedDoctor?.name ? `Dr. ${selectedDoctor.name}` : 'Unknown'
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
          emptyMessage={!selectedDoctor ? "Please select a doctor first" : "No procedures found for this doctor"}
          clearable
        />
      </div>
    );
  };

  return (
    <EditSetsErrorBoundary componentName="Modern Edit Sets" userAction="managing edit sets">
      <div className="modern-edit-sets" data-active-tab={activeTab}>
        <header className="edit-sets-header">
          <h1>Edit Sets Management</h1>
          <p>Manage doctors, procedures, and surgery sets for {normalizedCountry}</p>
        </header>

        {renderStepIndicator()}

        <main className="edit-sets-main">
          {/* Doctors Tab - Simple department dropdown + content */}
          {activeTab === TABS.DOCTORS && (
            <>
              <div className="tab-controls">
                {renderDepartmentSelection()}
              </div>
              {selectedDepartment && (
                <section className="edit-sets-content">
                  {renderControls()}
                  {renderAddForm()}
                  {renderDataList()}
                </section>
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
              {selectedDepartment && selectedDoctor && (
                <section className="edit-sets-content">
                  {renderControls()}
                  {renderAddForm()}
                  {renderDataList()}
                </section>
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
              {selectedDepartment && selectedDoctor && selectedProcedure && (
                <section className="surgery-implant-management">
                  {renderSurgeryImplantModeSelector()}
                  {renderSurgeryImplantContent()}
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </EditSetsErrorBoundary>
  );
};

export default ModernEditSets;