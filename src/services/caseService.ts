/**
 * Case Service - Centralized case management
 * Reduces code duplication and improves performance
 */

import { CaseBooking, CaseStatus, StatusHistory } from '../types';
import { auditCaseAmended } from '../utils/auditService';
import userService from './userService';
import notificationService from './notificationService';
import { hasPermission, PERMISSION_ACTIONS } from '../utils/permissions';

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
  getAllCases(forceRefresh = false): CaseBooking[] {
    const now = Date.now();
    const cacheValid = (now - this.lastFetchTime) < this.CACHE_DURATION;

    if (!forceRefresh && cacheValid && this.casesCache.size > 0) {
      return Array.from(this.casesCache.values());
    }

    try {
      const casesData = localStorage.getItem('cases');
      const cases: CaseBooking[] = casesData ? JSON.parse(casesData) : [];
      
      // Update cache
      this.casesCache.clear();
      cases.forEach(caseItem => {
        this.casesCache.set(caseItem.id, caseItem);
      });
      
      this.lastFetchTime = now;
      return cases;
    } catch (error) {
      console.error('Error loading cases:', error);
      return [];
    }
  }

  /**
   * Get case by ID
   */
  getCaseById(id: string): CaseBooking | null {
    if (this.casesCache.has(id)) {
      return this.casesCache.get(id)!;
    }

    const cases = this.getAllCases();
    return cases.find(c => c.id === id) || null;
  }

  /**
   * Save case
   */
  saveCase(caseData: CaseBooking): boolean {
    try {
      const cases = this.getAllCases();
      const existingIndex = cases.findIndex(c => c.id === caseData.id);
      
      if (existingIndex >= 0) {
        cases[existingIndex] = caseData;
      } else {
        cases.push(caseData);
      }
      
      localStorage.setItem('cases', JSON.stringify(cases));
      this.casesCache.set(caseData.id, caseData);
      
      return true;
    } catch (error) {
      console.error('Error saving case:', error);
      return false;
    }
  }

  /**
   * Amend case with audit logging
   */
  async amendCase(caseId: string, amendmentData: any): Promise<boolean> {
    try {
      const caseItem = this.getCaseById(caseId);
      if (!caseItem) {
        console.error('Case not found:', caseId);
        return false;
      }

      const currentUser = userService.getCurrentUser();
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

      // Create amended case
      const updatedCase: CaseBooking = {
        ...caseItem,
        ...amendmentData,
        isAmended: true,
        amendedBy: currentUser.name,
        amendedAt: new Date().toISOString(),
        amendmentReason: amendmentData.amendmentReason
      };

      const success = this.saveCase(updatedCase);
      
      if (success) {
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
          timestamp: new Date().toISOString()
        });
      }

      return success;
    } catch (error) {
      console.error('Error amending case:', error);
      return false;
    }
  }

  /**
   * Update case status with history tracking
   */
  updateCaseStatus(
    caseId: string, 
    newStatus: CaseStatus, 
    details?: string,
    attachments?: string[]
  ): boolean {
    try {
      const caseItem = this.getCaseById(caseId);
      if (!caseItem) {
        console.error('Case not found:', caseId);
        return false;
      }

      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return false;
      }

      // Check if user has permission to update case status
      if (!hasPermission(currentUser.role, PERMISSION_ACTIONS.UPDATE_CASE_STATUS)) {
        console.error('User does not have permission to update case status:', currentUser.role);
        return false;
      }

      const timestamp = new Date().toISOString();
      
      // Create status history entry
      const statusEntry: StatusHistory = {
        status: newStatus,
        timestamp,
        processedBy: currentUser.name,
        user: currentUser.name,
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

      const success = this.saveCase(updatedCase);
      
      if (success) {
        // Send notification
        notificationService.addNotification({
          title: `Case Status Updated: ${newStatus}`,
          message: `Case ${caseItem.caseReferenceNumber} has been updated to ${newStatus} by ${currentUser.name}`,
          type: 'success',
          timestamp
        });
      }

      return success;
    } catch (error) {
      console.error('Error updating case status:', error);
      return false;
    }
  }

  /**
   * Get cases filtered by user permissions
   */
  getCasesForUser(): CaseBooking[] {
    const currentUser = userService.getCurrentUser();
    if (!currentUser) return [];

    const allCases = this.getAllCases();

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
  searchCases(query: string): CaseBooking[] {
    if (!query.trim()) return this.getCasesForUser();

    const searchTerm = query.toLowerCase().trim();
    const cases = this.getCasesForUser();

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
  getCasesByStatus(status: CaseStatus): CaseBooking[] {
    const cases = this.getCasesForUser();
    return cases.filter(caseItem => caseItem.status === status);
  }

  /**
   * Get cases by date range
   */
  getCasesByDateRange(startDate: string, endDate: string): CaseBooking[] {
    const cases = this.getCasesForUser();
    return cases.filter(caseItem => {
      const caseDate = caseItem.dateOfSurgery;
      return caseDate >= startDate && caseDate <= endDate;
    });
  }

  /**
   * Delete case
   */
  deleteCase(caseId: string): boolean {
    try {
      const currentUser = userService.getCurrentUser();
      if (!currentUser) {
        console.error('No current user found');
        return false;
      }

      // Check if user has permission to delete cases
      if (!hasPermission(currentUser.role, PERMISSION_ACTIONS.DELETE_CASE)) {
        console.error('User does not have permission to delete cases:', currentUser.role);
        return false;
      }

      const cases = this.getAllCases();
      const filteredCases = cases.filter(c => c.id !== caseId);
      
      localStorage.setItem('cases', JSON.stringify(filteredCases));
      this.casesCache.delete(caseId);
      
      return true;
    } catch (error) {
      console.error('Error deleting case:', error);
      return false;
    }
  }

  /**
   * Generate unique case reference number
   */
  generateCaseReferenceNumber(): string {
    const cases = this.getAllCases();
    const currentYear = new Date().getFullYear();
    const yearCases = cases.filter(c => 
      c.caseReferenceNumber.startsWith(`TMC${currentYear}`)
    );
    
    const nextNumber = yearCases.length + 1;
    return `TMC${currentYear}${nextNumber.toString().padStart(4, '0')}`;
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
  getCasesCountByStatus(): Record<CaseStatus, number> {
    const cases = this.getCasesForUser();
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