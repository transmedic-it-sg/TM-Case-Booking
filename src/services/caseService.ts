/**
 * Case Service - Centralized case management
 * Reduces code duplication and improves performance
 */

import { CaseBooking, CaseStatus, StatusHistory } from '../types';
import { auditCaseAmended } from '../utils/auditService';
// import { getCurrentUser } from '../utils/auth'; // Replaced with userService
import userService from './userService';
import notificationService from './notificationService';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';
import { 
  getSupabaseCases,
  saveSupabaseCase, 
  updateSupabaseCaseStatus,
  amendSupabaseCase,
  deleteSupabaseCase,
  generateCaseReferenceNumber as generateSupabaseCaseReferenceNumber,
  checkCasesExist,
  migrateCasesFromLocalStorage
} from '../utils/supabaseCaseService';

class CaseService {
  private static instance: CaseService;
  private casesCache: Map<string, CaseBooking> = new Map();
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): CaseService {
    if (!CaseService.instance) {
      CaseService.instance = new CaseService();
    }
    return CaseService.instance;
  }

  /**
   * Get all cases with caching
   */
  async getAllCases(forceRefresh = false): Promise<CaseBooking[]> {
    const now = Date.now();
    const cacheValid = (now - this.lastFetchTime) < this.CACHE_DURATION;

    if (!forceRefresh && cacheValid && this.casesCache.size > 0) {
      return Array.from(this.casesCache.values());
    }

    try {
      // Check if cases exist in database, if not migrate from localStorage
      const casesExist = await checkCasesExist();
      
      if (!casesExist) {
        console.log('No cases in database, checking localStorage for migration...');
        await migrateCasesFromLocalStorage();
      }
      
      // Get current user to filter by country if not admin
      const currentUser = await userService.getCurrentUser();
      const country = currentUser?.role === 'admin' ? undefined : currentUser?.selectedCountry;
      
      const cases = await getSupabaseCases(country);
      
      // Update cache
      this.casesCache.clear();
      cases.forEach(caseItem => {
        this.casesCache.set(caseItem.id, caseItem);
      });
      
      this.lastFetchTime = now;
      return cases;
    } catch (error) {
      console.error('Error loading cases from database, falling back to localStorage:', error);
      
      // Fallback to localStorage
      try {
        const casesData = localStorage.getItem('cases') || localStorage.getItem('case-booking-cases');
        const cases: CaseBooking[] = casesData ? JSON.parse(casesData) : [];
        
        // Update cache
        this.casesCache.clear();
        cases.forEach(caseItem => {
          this.casesCache.set(caseItem.id, caseItem);
        });
        
        return cases;
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get case by ID
   */
  async getCaseById(id: string): Promise<CaseBooking | null> {
    if (this.casesCache.has(id)) {
      return this.casesCache.get(id)!;
    }

    const cases = await this.getAllCases();
    return cases.find(c => c.id === id) || null;
  }

  /**
   * Save case
   */
  async saveCase(caseData: CaseBooking): Promise<CaseBooking | null> {
    try {
      if (caseData.id && caseData.id !== 'new') {
        // Update existing case - this should not happen often for new cases
        console.warn('saveCase called with existing case ID, this may cause issues');
        // For existing cases, use amendment process instead
        return null;
      }
      
      // Create new case
      const newCase = await saveSupabaseCase({
        hospital: caseData.hospital,
        department: caseData.department,
        dateOfSurgery: caseData.dateOfSurgery,
        procedureType: caseData.procedureType,
        procedureName: caseData.procedureName,
        doctorName: caseData.doctorName,
        doctorId: caseData.doctorId,
        timeOfProcedure: caseData.timeOfProcedure,
        surgerySetSelection: caseData.surgerySetSelection,
        implantBox: caseData.implantBox,
        specialInstruction: caseData.specialInstruction,
        status: caseData.status,
        submittedBy: caseData.submittedBy,
        country: caseData.country,
        processedBy: caseData.processedBy,
        processedAt: caseData.processedAt,
        processOrderDetails: caseData.processOrderDetails,
        isAmended: caseData.isAmended,
        amendedBy: caseData.amendedBy,
        amendedAt: caseData.amendedAt
      });
      
      this.casesCache.set(newCase.id, newCase);
      this.clearCache(); // Force refresh on next load
      
      // Add in-app notification
      notificationService.addNotification({
        title: 'Case Created Successfully',
        message: `Case ${newCase.caseReferenceNumber} has been created`,
        type: 'success',
        timestamp: new Date().toISOString(),
        caseId: newCase.id,
        caseReferenceNumber: newCase.caseReferenceNumber
      });

      // Send unified notifications for new case (both email and push based on Email Configuration settings)
      try {
        const { sendUnifiedNotification } = await import('../utils/emailNotificationService');
        const notificationResults = await sendUnifiedNotification(newCase, 'Case Booked', {
          eventType: 'New Case Created'
        });
        console.log('📧📱 Unified notifications sent for new case:', notificationResults);
      } catch (error) {
        console.error('📧📱 Failed to send unified notifications for new case:', error);
      }
      
      return newCase;
    } catch (error) {
      console.error('Error saving case to database:', error);
      
      // Fallback to localStorage for backward compatibility
      try {
        const cases = await this.getAllCases();
        const existingIndex = cases.findIndex(c => c.id === caseData.id);
        
        if (existingIndex >= 0) {
          cases[existingIndex] = caseData;
        } else {
          cases.push(caseData);
        }
        
        localStorage.setItem('cases', JSON.stringify(cases));
        this.casesCache.set(caseData.id, caseData);
        
        return caseData;
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
        return null;
      }
    }
  }

  /**
   * Amend case with audit logging
   */
  async amendCase(caseId: string, amendmentData: any): Promise<boolean> {
    try {
      const caseItem = await this.getCaseById(caseId);
      if (!caseItem) {
        console.error('Case not found:', caseId);
        return false;
      }

      const currentUser = await userService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return false;
      }

      // Check if user has permission to amend cases
      if (!hasPermission(currentUser.role, PERMISSION_ACTIONS.AMEND_CASE)) {
        console.error('User does not have permission to amend cases:', currentUser.role);
        return false;
      }

      // Track changes for audit
      const changes: string[] = [];
      Object.keys(amendmentData).forEach(key => {
        if (key !== 'amendmentReason' && (caseItem as any)[key] !== amendmentData[key]) {
          changes.push(`${key}: "${(caseItem as any)[key]}" → "${amendmentData[key]}"`);
        }
      });

      // Use Supabase amendment service instead of saveCase
      try {
        await amendSupabaseCase(caseId, amendmentData, currentUser.name);
        this.clearCache(); // Force refresh
        
        // Add audit log
        await auditCaseAmended(
          currentUser.name,
          currentUser.id,
          currentUser.role,
          caseItem.caseReferenceNumber,
          changes,
          caseItem.country,
          caseItem.department
        );

        // Send notification
        notificationService.addNotification({
          title: 'Case Amended',
          message: `Case ${caseItem.caseReferenceNumber} has been amended by ${currentUser.name}`,
          type: 'success',
          timestamp: new Date().toISOString(),
          caseId: caseItem.id,
          caseReferenceNumber: caseItem.caseReferenceNumber
        });
        
        return true;
      } catch (amendError) {
        console.error('Database amendment failed, falling back to localStorage:', amendError);
        
        // Fallback to localStorage method
        const updatedCase: CaseBooking = {
          ...caseItem,
          ...amendmentData,
          isAmended: true,
          amendedBy: currentUser.name,
          amendedAt: new Date().toISOString(),
          amendmentReason: amendmentData.amendmentReason
        };

        const cases = await this.getAllCases();
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex >= 0) {
          cases[caseIndex] = updatedCase;
          localStorage.setItem('cases', JSON.stringify(cases));
          this.casesCache.set(caseId, updatedCase);
          
          // Add audit log
          await auditCaseAmended(
            currentUser.name,
            currentUser.id,
            currentUser.role,
            caseItem.caseReferenceNumber,
            changes,
            caseItem.country,
            caseItem.department
          );

          // Send notification
          notificationService.addNotification({
            title: 'Case Amended',
            message: `Case ${caseItem.caseReferenceNumber} has been amended by ${currentUser.name}`,
            type: 'success',
            timestamp: new Date().toISOString(),
            caseId: caseItem.id,
            caseReferenceNumber: caseItem.caseReferenceNumber
          });
          
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error('Error amending case:', error);
      return false;
    }
  }

  /**
   * Update case status with history tracking
   */
  async updateCaseStatus(
    caseId: string, 
    newStatus: CaseStatus, 
    details?: string,
    attachments?: string[]
  ): Promise<boolean> {
    try {
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return false;
      }

      // Check if user has permission to update case status
      if (!hasPermission(currentUser.role, PERMISSION_ACTIONS.UPDATE_CASE_STATUS)) {
        console.error('User does not have permission to update case status:', currentUser.role);
        return false;
      }

      // Get current case for comparison and notifications
      const currentCase = await this.getCaseById(caseId);
      const oldStatus = currentCase?.status;

      // Use Supabase service to update case status
      await updateSupabaseCaseStatus(
        caseId, 
        newStatus, 
        currentUser.name, 
        details, 
        attachments
      );
      
      // Clear cache to force refresh
      this.clearCache();
      
      // Get updated case for notification
      const updatedCase = await this.getCaseById(caseId);
      if (updatedCase) {
        // Send in-app notification
        notificationService.addNotification({
          title: `Case Status Updated: ${newStatus}`,
          message: `Case ${updatedCase.caseReferenceNumber} has been updated to ${newStatus} by ${currentUser.name}`,
          type: 'success',
          timestamp: new Date().toISOString(),
          caseId: updatedCase.id,
          caseReferenceNumber: updatedCase.caseReferenceNumber
        });

        // Send unified notifications (both email and push based on Email Configuration settings)
        try {
          const { sendUnifiedNotification } = await import('../utils/emailNotificationService');
          const notificationResults = await sendUnifiedNotification(updatedCase, newStatus, {
            eventType: 'Status Change',
            previousStatus: oldStatus || 'Unknown',
            changedBy: currentUser.name,
            changedAt: new Date().toLocaleString()
          });
          console.log('📧📱 Unified notifications sent:', notificationResults);
        } catch (error) {
          console.error('📧📱 Failed to send unified notifications:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating case status in database:', error);
      
      // Fallback to localStorage method
      try {
        const caseItem = await this.getCaseById(caseId);
        if (!caseItem) {
          console.error('Case not found:', caseId);
          return false;
        }

        const currentUser = await userService.getCurrentUser();
        if (!currentUser) {
          console.error('No current user found');
          return false;
        }

        const timestamp = new Date().toISOString();
        
        // Create status history entry
        const statusEntry: StatusHistory = {
          status: newStatus,
          timestamp,
          processedBy: currentUser.name,
          user: currentUser.name, // Ensure user field is set for compatibility
          details: details || '',
          attachments: attachments || []
        };

        // Update case
        const updatedCase: CaseBooking = {
          ...caseItem,
          status: newStatus,
          statusHistory: [...(caseItem.statusHistory || []), statusEntry],
          // Update status-specific fields
          ...(newStatus === 'Order Preparation' && {
            processedBy: currentUser.name,
            processedAt: timestamp,
            processOrderDetails: details
          })
        };

        // Save to localStorage as fallback
        const cases = await this.getAllCases();
        const caseIndex = cases.findIndex(c => c.id === caseId);
        if (caseIndex >= 0) {
          cases[caseIndex] = updatedCase;
          localStorage.setItem('cases', JSON.stringify(cases));
          this.casesCache.set(caseId, updatedCase);
          
          notificationService.addNotification({
            title: `Case Status Updated: ${newStatus}`,
            message: `Case ${caseItem.caseReferenceNumber} has been updated to ${newStatus} by ${currentUser.name}`,
            type: 'success',
            timestamp,
            caseId: caseItem.id,
            caseReferenceNumber: caseItem.caseReferenceNumber
          });
          
          return true;
        }
        
        return false;
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Get cases filtered by user permissions
   */
  async getCasesForUser(): Promise<CaseBooking[]> {
    const currentUser = await userService.getCurrentUser();
    if (!currentUser) return [];

    const allCases = await this.getAllCases();

    // Admin sees all cases
    if (currentUser.role === 'admin') {
      return allCases;
    }

    // Filter by user's countries and departments
    return allCases.filter(caseItem => {
      const hasCountryAccess = currentUser.countries.includes(caseItem.country);
      const hasDepartmentAccess = currentUser.departments.length === 0 || 
        currentUser.departments.includes(caseItem.department);
      
      return hasCountryAccess && hasDepartmentAccess;
    });
  }

  /**
   * Search cases
   */
  async searchCases(query: string): Promise<CaseBooking[]> {
    if (!query.trim()) return await this.getCasesForUser();

    const searchTerm = query.toLowerCase().trim();
    const cases = await this.getCasesForUser();

    return cases.filter(caseItem => 
      caseItem.caseReferenceNumber.toLowerCase().includes(searchTerm) ||
      caseItem.hospital.toLowerCase().includes(searchTerm) ||
      caseItem.doctorName?.toLowerCase().includes(searchTerm) ||
      caseItem.procedureType.toLowerCase().includes(searchTerm) ||
      caseItem.procedureName.toLowerCase().includes(searchTerm) ||
      caseItem.submittedBy.toLowerCase().includes(searchTerm)
    );
  }

  /**
   * Get cases by status
   */
  async getCasesByStatus(status: CaseStatus): Promise<CaseBooking[]> {
    const cases = await this.getCasesForUser();
    return cases.filter(caseItem => caseItem.status === status);
  }

  /**
   * Get cases by date range
   */
  async getCasesByDateRange(startDate: string, endDate: string): Promise<CaseBooking[]> {
    const cases = await this.getCasesForUser();
    return cases.filter(caseItem => {
      const caseDate = caseItem.dateOfSurgery;
      return caseDate >= startDate && caseDate <= endDate;
    });
  }

  /**
   * Delete case
   */
  async deleteCase(caseId: string): Promise<boolean> {
    try {
      const currentUser = await userService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return false;
      }

      // Check if user has permission to delete cases
      if (!hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_CASE)) {
        console.error('User does not have permission to delete cases:', currentUser.role);
        return false;
      }

      // Use Supabase service to delete case
      await deleteSupabaseCase(caseId);
      this.casesCache.delete(caseId);
      this.clearCache(); // Force refresh
      
      return true;
    } catch (error) {
      console.error('Error deleting case from database:', error);
      
      // Fallback to localStorage
      try {
        const cases = await this.getAllCases();
        const filteredCases = cases.filter(c => c.id !== caseId);
        
        localStorage.setItem('cases', JSON.stringify(filteredCases));
        this.casesCache.delete(caseId);
        
        return true;
      } catch (fallbackError) {
        console.error('Fallback to localStorage also failed:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Generate unique case reference number
   */
  async generateCaseReferenceNumber(): Promise<string> {
    try {
      const currentUser = await userService.getCurrentUser();
      const country = currentUser?.selectedCountry || currentUser?.countries?.[0] || 'SG';
      
      // Use database-based reference number generation
      return await generateSupabaseCaseReferenceNumber(country);
    } catch (error) {
      console.error('Error generating case reference number from database:', error);
      
      // Fallback to localStorage method
      try {
        const cases = await this.getAllCases();
        const currentYear = new Date().getFullYear();
        const yearCases = cases.filter(c => 
          c.caseReferenceNumber.startsWith(`TMC${currentYear}`) ||
          c.caseReferenceNumber.includes(`-${currentYear}-`)
        );
        
        const nextNumber = yearCases.length + 1;
        return `TMC${currentYear}${nextNumber.toString().padStart(4, '0')}`;
      } catch (fallbackError) {
        console.error('Fallback reference number generation failed:', fallbackError);
        // Ultimate fallback
        const timestamp = Date.now();
        return `TMC${new Date().getFullYear()}${timestamp.toString().slice(-4)}`;
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.casesCache.clear();
    this.lastFetchTime = 0;
  }

  /**
   * Get cases count by status
   */
  async getCasesCountByStatus(): Promise<Record<CaseStatus, number>> {
    const cases = await this.getCasesForUser();
    const counts = {} as Record<CaseStatus, number>;

    // Initialize all possible statuses with 0
    const allStatuses: CaseStatus[] = [
      'Case Booked',
      'Order Preparation', 
      'Order Prepared',
      'Pending Delivery (Hospital)',
      'Delivered (Hospital)',
      'Case Completed',
      'Pending Delivery (Office)',
      'Delivered (Office)',
      'To be billed',
      'Case Closed',
      'Case Cancelled'
    ];

    allStatuses.forEach(status => {
      counts[status] = 0;
    });

    cases.forEach(caseItem => {
      if (counts[caseItem.status] !== undefined) {
        counts[caseItem.status]++;
      }
    });

    return counts;
  }
}

export default CaseService.getInstance();