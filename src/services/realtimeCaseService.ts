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
    console.log('🔄 Fetching fresh cases from database (no cache)...');
    
    try {
      // Always check database first - no cache considerations
      const casesExist = await checkCasesExist();
      
      if (!casesExist) {
        console.log('No cases in database, checking localStorage for migration...');
        await migrateCasesFromLocalStorage();
      }
      
      // Get current user to filter by country if not admin
      const currentUser = await userService.getCurrentUser();
      const country = currentUser?.role === 'admin' ? undefined : currentUser?.selectedCountry;
      
      // DIRECT DATABASE CALL - no cache check
      const cases = await getSupabaseCases(country);
      
      console.log(`✅ Fresh cases loaded: ${cases.length} cases from database`);
      return cases;
      
    } catch (error) {
      console.error('❌ Error loading cases from database:', error);
      
      // Even fallback is fresh - no localStorage caching
      throw new Error(`Failed to load cases: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get case by ID - ALWAYS FRESH from database
   */
  async getCaseById(caseId: string): Promise<CaseBooking | null> {
    console.log(`🔄 Fetching fresh case ${caseId} from database...`);
    
    try {
      // Get all cases fresh and find the one we need
      const cases = await this.getAllCases();
      const caseItem = cases.find(c => c.id === caseId);
      
      if (caseItem) {
        console.log(`✅ Fresh case found: ${caseId}`);
      } else {
        console.log(`⚠️ Case not found: ${caseId}`);
      }
      
      return caseItem || null;
    } catch (error) {
      console.error(`❌ Error fetching case ${caseId}:`, error);
      return null;
    }
  }

  /**
   * Save case - Direct database operation
   */
  async saveCase(caseData: CaseBooking): Promise<CaseBooking | null> {
    console.log(`💾 Saving case ${caseData.caseReferenceNumber} directly to database...`);
    
    try {
      const savedCase = await saveSupabaseCase(caseData);
      
      if (savedCase) {
        console.log(`✅ Case saved successfully: ${caseData.caseReferenceNumber}`);
        
        // Send notifications - but no cache updates needed
        notificationService.addNotification({
          title: 'Case Saved',
          message: `Case ${caseData.caseReferenceNumber} has been saved successfully`,
          type: 'success',
          timestamp: new Date().toISOString(),
          read: false
        });
      }
      
      return savedCase;
    } catch (error) {
      console.error(`❌ Error saving case ${caseData.caseReferenceNumber}:`, error);
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
  ): Promise<boolean> {
    console.log(`🔄 Updating case ${caseId} status to ${newStatus} in database...`);
    
    try {
      await updateSupabaseCaseStatus(caseId, newStatus, 'system', details, attachments);
      
      console.log(`✅ Case status updated successfully: ${caseId} -> ${newStatus}`);
      
      // Send notifications - but no cache updates needed
      notificationService.addNotification({
        title: 'Status Updated',
        message: `Case status updated to ${newStatus}`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Error updating case status ${caseId}:`, error);
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
  ): Promise<boolean> {
    console.log(`✏️ Amending case ${caseId} in database...`);
    
    try {
      await amendSupabaseCase(caseId, amendmentData, userInfo.name);
      
      console.log(`✅ Case amended successfully: ${caseId}`);
      
      // Audit trail
      await auditCaseAmended(userInfo.name, userInfo.id, 'admin', caseId, ['case amended'], 'Singapore', 'General');
      
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
      console.error(`❌ Error amending case ${caseId}:`, error);
      return false;
    }
  }

  /**
   * Delete case - Direct database operation
   */
  async deleteCase(caseId: string): Promise<boolean> {
    console.log(`🗑️ Deleting case ${caseId} from database...`);
    
    try {
      await deleteSupabaseCase(caseId);
      
      console.log(`✅ Case deleted successfully: ${caseId}`);
      
      // Send notifications - but no cache updates needed
      notificationService.addNotification({
        title: 'Case Deleted',
        message: `Case ${caseId} has been deleted successfully`,
        type: 'success',
        timestamp: new Date().toISOString(),
        read: false
      });
      
      return true;
    } catch (error) {
      console.error(`❌ Error deleting case ${caseId}:`, error);
      return false;
    }
  }

  /**
   * Generate case reference number - Direct database operation
   */
  async generateCaseReferenceNumber(country?: string): Promise<string> {
    console.log(`🔢 Generating fresh case reference number for ${country || 'default'}...`);
    
    try {
      const referenceNumber = await generateSupabaseCaseReferenceNumber(country || 'Singapore');
      console.log(`✅ Generated reference number: ${referenceNumber}`);
      return referenceNumber;
    } catch (error) {
      console.error('❌ Error generating reference number:', error);
      throw error;
    }
  }

  /**
   * Get cases by status - ALWAYS FRESH from database
   */
  async getCasesByStatus(status: CaseStatus): Promise<CaseBooking[]> {
    console.log(`🔄 Fetching fresh cases with status ${status}...`);
    
    try {
      const allCases = await this.getAllCases();
      const filteredCases = allCases.filter(caseItem => caseItem.status === status);
      
      console.log(`✅ Found ${filteredCases.length} cases with status ${status}`);
      return filteredCases;
    } catch (error) {
      console.error(`❌ Error fetching cases by status ${status}:`, error);
      return [];
    }
  }

  /**
   * Get cases by country - ALWAYS FRESH from database
   */
  async getCasesByCountry(country: string): Promise<CaseBooking[]> {
    console.log(`🔄 Fetching fresh cases for country ${country}...`);
    
    try {
      // Get cases with country filter directly
      const cases = await getSupabaseCases(country);
      
      console.log(`✅ Found ${cases.length} cases for country ${country}`);
      return cases;
    } catch (error) {
      console.error(`❌ Error fetching cases for country ${country}:`, error);
      return [];
    }
  }

  /**
   * Search cases - ALWAYS FRESH from database
   */
  async searchCases(searchTerm: string): Promise<CaseBooking[]> {
    console.log(`🔍 Searching fresh cases for term: ${searchTerm}...`);
    
    try {
      const allCases = await this.getAllCases();
      const searchTermLower = searchTerm.toLowerCase();
      
      const matchingCases = allCases.filter(caseItem =>
        caseItem.caseReferenceNumber.toLowerCase().includes(searchTermLower) ||
        caseItem.hospital.toLowerCase().includes(searchTermLower) ||
        caseItem.doctorName?.toLowerCase().includes(searchTermLower) ||
        caseItem.procedureType.toLowerCase().includes(searchTermLower) ||
        caseItem.procedureName.toLowerCase().includes(searchTermLower) ||
        caseItem.submittedBy.toLowerCase().includes(searchTermLower)
      );
      
      console.log(`✅ Found ${matchingCases.length} cases matching "${searchTerm}"`);
      return matchingCases;
    } catch (error) {
      console.error(`❌ Error searching cases for "${searchTerm}":`, error);
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
  }> {
    console.log('📊 Calculating fresh case statistics...');
    
    try {
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
      });
      
      console.log('✅ Fresh statistics calculated:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error calculating statistics:', error);
      return { total: 0, byStatus: {} as any, byCountry: {} };
    }
  }
}

// Export singleton instance
export const realtimeCaseService = RealtimeCaseService.getInstance();
export default realtimeCaseService;