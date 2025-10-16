/**
 * Real-time Case Service - NO CACHING, Always Fresh Data
 * Replaces cacheService.ts with direct Supabase queries
 * Designed for 50-100 concurrent users with real-time updates
 */

import { CaseBooking, CaseStatus } from '../types';
import { auditCaseAmended } from '../utils/auditService';
import userService from './userService';
import notificationService from './notificationService';
import { hasPermission } from '../utils/permissions';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../utils/fieldMappings';
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

/**
 * Real-time Case Service - Zero Caching Implementation
 * Every call goes directly to Supabase for fresh data
 */
class RealtimeCaseService {
  private static instance: RealtimeCaseService;

  // NO CACHE VARIABLES - removed completely
  // NO lastFetchTime - removed completely
  // NO CACHE_DURATION - removed completely

  static getInstance(): RealtimeCaseService {
    if (!RealtimeCaseService.instance) {
      RealtimeCaseService.instance = new RealtimeCaseService();
    }
    return RealtimeCaseService.instance;
  }

  /**
   * Get all cases - ALWAYS FRESH from database
   * NO CACHING - every call hits Supabase directly
   */
  async getAllCases(): Promise<CaseBooking[]> {
    try {
      // Always check database first - no cache considerations
      const casesExist = await checkCasesExist();

      if (!casesExist) {
        await migrateCasesFromLocalStorage();
      }

      // Get current user to filter by country if not admin
      const currentUser = await userService.getCurrentUser();
      const country = currentUser?.role === 'admin' ? undefined : currentUser?.selectedCountry;

      // DIRECT DATABASE CALL - no cache check
      const cases = await getSupabaseCases(country);return cases;

    } catch (error) {
      // Even fallback is fresh - no localStorage caching
      throw new Error(`Failed to load cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get case by ID - ALWAYS FRESH from database
   */
  async getCaseById(caseId: string): Promise<CaseBooking | null> {try {
      // Get all cases fresh and find the one we need
      const cases = await this.getAllCases();
      const caseItem = cases.find(c => c.id === caseId);

      if (caseItem) {} else {}

      return caseItem || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save case - Direct database operation
   */
  async saveCase(caseData: CaseBooking): Promise<CaseBooking | null> {try {
      const savedCase = await saveSupabaseCase(caseData);

      if (savedCase) {// Send notifications - but no cache updates needed
        notificationService.addNotification({
          title: 'Case Saved',
          message: `Case ${caseData.caseReferenceNumber} has been saved successfully`,
          type: 'success',
          timestamp: new Date().toISOString(), // ⚠️ timestamp field
          read: false
        });
      }

      return savedCase;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update case status - Direct database operation
   */
  async updateCaseStatus(
    caseId: string,
    newStatus: CaseStatus,
    details?: string,
    attachments?: string[]
  ): Promise<boolean> {try {
      await updateSupabaseCaseStatus(caseId, newStatus, 'system', details, attachments);// Send notifications - but no cache updates needed
      notificationService.addNotification({
        title: 'Status Updated',
        message: `Case status updated to ${newStatus}`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Amend case - Direct database operation
   */
  async amendCase(
    caseId: string,
    amendmentData: Partial<CaseBooking>,
    userInfo: { id: string; name: string }
  ): Promise<boolean> {try {
      await amendSupabaseCase(caseId, amendmentData, userInfo.name);
      
      // Get case to determine country and department
      const caseData = await this.getCaseById(caseId);
      const country = caseData?.country || amendmentData.country;
      const department = caseData?.department || amendmentData.department || 'General';
      
      // Audit trail with actual country and department
      await auditCaseAmended(userInfo.name, userInfo.id, 'admin', caseId, ['case amended'], country, department);

      // Send notifications - but no cache updates needed
      notificationService.addNotification({
        title: 'Case Amended',
        message: `Case ${caseId} has been amended successfully`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete case - Direct database operation
   */
  async deleteCase(caseId: string): Promise<boolean> {try {
      await deleteSupabaseCase(caseId);// Send notifications - but no cache updates needed
      notificationService.addNotification({
        title: 'Case Deleted',
        message: `Case ${caseId} has been deleted successfully`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate case reference number - Direct database operation
   */
  async generateCaseReferenceNumber(country?: string): Promise<string> {try {
      // Get country from user context if not provided
      if (!country || !country.trim()) {
        const currentUser = await userService.getCurrentUser();
        country = currentUser?.selectedCountry || currentUser?.countries?.[0];
        if (!country) {
          throw new Error('No country specified for case reference generation');
        }
      }
      
      const referenceNumber = await generateSupabaseCaseReferenceNumber(country);return referenceNumber;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cases by status - ALWAYS FRESH from database
   */
  async getCasesByStatus(status: CaseStatus): Promise<CaseBooking[]> {try {
      const allCases = await this.getAllCases();
      const filteredCases = allCases.filter(caseItem => caseItem.status === status);return filteredCases;
    } catch (error) {
      return [];
    }
  }

  /**
   * Get cases by country - ALWAYS FRESH from database
   */
  async getCasesByCountry(country: string): Promise<CaseBooking[]> {try {
      // Get cases with country filter directly
      const cases = await getSupabaseCases(country);return cases;
    } catch (error) {
      return [];
    }
  }

  /**
   * Search cases - ALWAYS FRESH from database
   */
  async searchCases(searchTerm: string): Promise<CaseBooking[]> {try {
      const allCases = await this.getAllCases();
      const searchTermLower = searchTerm.toLowerCase();

      const matchingCases = allCases.filter(caseItem =>
        caseItem.caseReferenceNumber.toLowerCase().includes(searchTermLower) ||
        caseItem.hospital.toLowerCase().includes(searchTermLower) ||
        caseItem.doctorName?.toLowerCase().includes(searchTermLower) ||
        caseItem.procedureType.toLowerCase().includes(searchTermLower) ||
        caseItem.procedureName.toLowerCase().includes(searchTermLower) ||
        caseItem.submittedBy.toLowerCase().includes(searchTermLower)
      );return matchingCases;
    } catch (error) {
      return [];
    }
  }

  /**
   * Check user permissions for case operations
   */
  async checkCasePermission(action: string, userRole: string): Promise<boolean> {
    return hasPermission(userRole, action as any);
  }

  /**
   * Get real-time statistics - ALWAYS FRESH
   */
  async getCaseStatistics(): Promise<{
    total: number;
    byStatus: Record<CaseStatus, number>;
    byCountry: Record<string, number>;
  }> {try {
      const allCases = await this.getAllCases();

      const stats = {
        total: allCases.length,
        byStatus: {} as Record<CaseStatus, number>,
        byCountry: {} as Record<string, number>
      };

      // Count by status
      allCases.forEach(caseItem => {
        stats.byStatus[caseItem.status] = (stats.byStatus[caseItem.status] || 0) + 1;
        stats.byCountry[caseItem.country] = (stats.byCountry[caseItem.country] || 0) + 1;
      });return stats;
    } catch (error) {
      return { total: 0, byStatus: {} as any, byCountry: {} };
    }
  }
}

// Export singleton instance
export const realtimeCaseService = RealtimeCaseService.getInstance();
export default realtimeCaseService;