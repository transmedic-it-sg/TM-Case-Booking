/**
 * Hybrid Storage Service - Production Ready
 * Implements Supabase-first approach with LocalStorage fallback after 3 failed attempts
 * Provides seamless data synchronization and offline capability for 100+ concurrent users
 */

import { supabase } from '../lib/supabase';
import { CaseBooking, FilterOptions } from '../types';
import { caseOperations } from './supabaseServiceFixed';

interface StorageMetrics {
  supabaseAttempts: number;
  supabaseFailures: number;
  lastSuccessfulConnection: Date | null;
  isOfflineMode: boolean;
  syncQueue: any[];
  lastSyncAttempt: Date | null;
}

class HybridStorageService {
  private metrics: StorageMetrics = {
    supabaseAttempts: 0,
    supabaseFailures: 0,
    lastSuccessfulConnection: null,
    isOfflineMode: false,
    syncQueue: [],
    lastSyncAttempt: null
  };

  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 30000; // 30 seconds
  private readonly STORAGE_KEYS = {
    CASES: 'hybrid-cases',
    METRICS: 'hybrid-metrics',
    SYNC_QUEUE: 'hybrid-sync-queue',
    USER_SESSION: 'hybrid-user-session'
  };

  constructor() {
    this.loadMetrics();
    this.setupPeriodicSync();
    this.setupConnectionMonitoring();
  }

  // ===========================================================================
  // CONNECTION MANAGEMENT
  // ===========================================================================

  private async checkSupabaseConnection(): Promise<boolean> {
    try {
      this.metrics.supabaseAttempts++;
      const { error } = await supabase
        .from('code_tables')
        .select('count')
        .limit(1);

      if (error) {
        this.metrics.supabaseFailures++;
        this.saveMetrics();
        return false;
      }

      // Reset failure count on successful connection
      this.metrics.supabaseFailures = 0;
      this.metrics.lastSuccessfulConnection = new Date();
      this.metrics.isOfflineMode = false;
      this.saveMetrics();
      return true;
    } catch (error) {
      this.metrics.supabaseFailures++;
      this.saveMetrics();
      return false;
    }
  }

  private shouldUseSupabase(): boolean {
    // Use Supabase if we haven't exceeded retry limit
    return this.metrics.supabaseFailures < this.MAX_RETRIES;
  }

  private switchToOfflineMode(): void {
    this.metrics.isOfflineMode = true;
    this.saveMetrics();
    
    // Log for production monitoring (optimized for multi-user environment)
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔥 Switched to offline mode after 3 Supabase failures');
    } else {
      // In production, only log critical errors to reduce bandwidth
      console.error('[CRITICAL] Offline mode activated - Supabase unreachable');
    }
  }

  // ===========================================================================
  // CASE OPERATIONS WITH FALLBACK
  // ===========================================================================

  async getCases(filters?: FilterOptions): Promise<CaseBooking[]> {
    if (this.shouldUseSupabase()) {
      try {
        const result = await caseOperations.getAll(filters);
        
        if (result.success && result.data) {
          // Cache successful result locally
          this.cacheToLocal('cases', result.data);
          return result.data;
        } else {
          throw new Error(result.error || 'Failed to fetch cases');
        }
      } catch (error) {
        this.metrics.supabaseFailures++;
        
        if (this.metrics.supabaseFailures >= this.MAX_RETRIES) {
          this.switchToOfflineMode();
        }
        
        // Fallback to local storage
        return this.getCasesFromLocal(filters);
      }
    }

    // Already in offline mode - use local storage
    return this.getCasesFromLocal(filters);
  }

  async saveCase(caseData: CaseBooking): Promise<void> {
    // Always save to local first for immediate UI feedback
    this.saveCaseToLocal(caseData);

    if (this.shouldUseSupabase()) {
      try {
        let result;
        
        if (caseData.id && caseData.id !== 'temp-id') {
          result = await caseOperations.update(caseData.id, caseData);
        } else {
          result = await caseOperations.create(caseData);
        }

        if (!result.success) {
          throw new Error(result.error || 'Failed to save case');
        }

        // Update local cache with server response
        if (result.data) {
          this.updateLocalCase(result.data);
        }
        
        return;
      } catch (error) {
        this.metrics.supabaseFailures++;
        
        if (this.metrics.supabaseFailures >= this.MAX_RETRIES) {
          this.switchToOfflineMode();
        }
        
        // Add to sync queue for later synchronization
        this.addToSyncQueue('saveCase', caseData);
        console.warn('Case saved locally - will sync when connection restored');
        return;
      }
    }

    // In offline mode - add to sync queue
    this.addToSyncQueue('saveCase', caseData);
  }

  async updateCaseStatus(caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): Promise<void> {
    // Update local immediately
    this.updateLocalCaseStatus(caseId, status, processedBy, details);

    if (this.shouldUseSupabase()) {
      try {
        const result = await caseOperations.updateStatus(caseId, status, processedBy || 'System', details);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update case status');
        }
        
        return;
      } catch (error) {
        this.metrics.supabaseFailures++;
        
        if (this.metrics.supabaseFailures >= this.MAX_RETRIES) {
          this.switchToOfflineMode();
        }
        
        // Add to sync queue
        this.addToSyncQueue('updateCaseStatus', { caseId, status, processedBy, details });
        return;
      }
    }

    // In offline mode - add to sync queue
    this.addToSyncQueue('updateCaseStatus', { caseId, status, processedBy, details });
  }

  // ===========================================================================
  // LOCAL STORAGE OPERATIONS
  // ===========================================================================

  private getCasesFromLocal(filters?: FilterOptions): CaseBooking[] {
    try {
      const cachedCases = localStorage.getItem(this.STORAGE_KEYS.CASES);
      const cases: CaseBooking[] = cachedCases ? JSON.parse(cachedCases) : [];
      
      if (!filters) return cases;
      
      // Apply filters locally
      return cases.filter(caseItem => {
        if (filters.submitter && !caseItem.submittedBy.toLowerCase().includes(filters.submitter.toLowerCase())) {
          return false;
        }
        
        if (filters.hospital && !caseItem.hospital.toLowerCase().includes(filters.hospital.toLowerCase())) {
          return false;
        }
        
        if (filters.status && caseItem.status !== filters.status) {
          return false;
        }
        
        if (filters.dateFrom && caseItem.dateOfSurgery < filters.dateFrom) {
          return false;
        }
        
        if (filters.dateTo && caseItem.dateOfSurgery > filters.dateTo) {
          return false;
        }
        
        if (filters.country && caseItem.country !== filters.country) {
          return false;
        }
        
        return true;
      });
    } catch (error) {
      console.error('Error reading from local storage:', error);
      return [];
    }
  }

  private saveCaseToLocal(caseData: CaseBooking): void {
    try {
      const cases = this.getCasesFromLocal();
      
      // Generate temporary ID if needed
      if (!caseData.id || caseData.id === 'temp-id') {
        caseData.id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      const existingIndex = cases.findIndex(c => c.id === caseData.id);
      
      if (existingIndex >= 0) {
        cases[existingIndex] = caseData;
      } else {
        cases.unshift({ ...caseData, submittedAt: new Date().toISOString() });
      }
      
      this.cacheToLocal('cases', cases);
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  private updateLocalCase(caseData: CaseBooking): void {
    try {
      const cases = this.getCasesFromLocal();
      const index = cases.findIndex(c => c.id === caseData.id);
      
      if (index >= 0) {
        cases[index] = caseData;
        this.cacheToLocal('cases', cases);
      }
    } catch (error) {
      console.error('Error updating local case:', error);
    }
  }

  private updateLocalCaseStatus(caseId: string, status: CaseBooking['status'], processedBy?: string, details?: string): void {
    try {
      const cases = this.getCasesFromLocal();
      const caseIndex = cases.findIndex(c => c.id === caseId);
      
      if (caseIndex >= 0) {
        cases[caseIndex] = {
          ...cases[caseIndex],
          status,
          processedBy,
          processedAt: new Date().toISOString(),
          processOrderDetails: details || cases[caseIndex].processOrderDetails
        };
        
        this.cacheToLocal('cases', cases);
      }
    } catch (error) {
      console.error('Error updating local case status:', error);
    }
  }

  private cacheToLocal(key: string, data: any): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS[key.toUpperCase() as keyof typeof this.STORAGE_KEYS] || `hybrid-${key}`, JSON.stringify(data));
    } catch (error) {
      // Handle localStorage quota exceeded
      console.error('LocalStorage quota exceeded, clearing old data:', error);
      this.cleanupLocalStorage();
    }
  }

  // ===========================================================================
  // SYNC QUEUE MANAGEMENT
  // ===========================================================================

  private addToSyncQueue(operation: string, data: any): void {
    this.metrics.syncQueue.push({
      id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      data,
      timestamp: new Date().toISOString(),
      attempts: 0
    });
    
    this.saveSyncQueue();
  }

  private async processSyncQueue(): Promise<void> {
    if (this.metrics.syncQueue.length === 0 || !this.shouldUseSupabase()) {
      return;
    }

    const connectionOk = await this.checkSupabaseConnection();
    if (!connectionOk) return;

    const queueCopy = [...this.metrics.syncQueue];
    this.metrics.syncQueue = [];

    for (const item of queueCopy) {
      try {
        switch (item.operation) {
          case 'saveCase':
            await caseOperations.create(item.data);
            break;
          case 'updateCaseStatus':
            const { caseId, status, processedBy, details } = item.data;
            await caseOperations.updateStatus(caseId, status, processedBy, details);
            break;
          default:
            console.warn('Unknown sync operation:', item.operation);
        }
        
        // Successfully synced - remove from queue
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Synced:', item.operation, item.id);
        }
      } catch (error) {
        // Failed to sync - add back to queue with attempt counter
        item.attempts = (item.attempts || 0) + 1;
        
        if (item.attempts < 3) {
          this.metrics.syncQueue.push(item);
        } else {
          console.error('Failed to sync after 3 attempts:', item.operation, error);
        }
      }
    }

    this.saveSyncQueue();
    this.metrics.lastSyncAttempt = new Date();
    this.saveMetrics();
  }

  // ===========================================================================
  // PERIODIC OPERATIONS
  // ===========================================================================

  private setupPeriodicSync(): void {
    setInterval(async () => {
      if (this.metrics.syncQueue.length > 0) {
        await this.processSyncQueue();
      }
    }, this.SYNC_INTERVAL);
  }

  private setupConnectionMonitoring(): void {
    // Monitor connection every 5 minutes
    setInterval(async () => {
      if (this.metrics.isOfflineMode && this.metrics.supabaseFailures >= this.MAX_RETRIES) {
        // Try to restore connection
        const connectionRestored = await this.checkSupabaseConnection();
        if (connectionRestored) {
          console.log('✅ Connection restored - switching back to online mode');
          await this.processSyncQueue();
        }
      }
    }, 300000); // 5 minutes
  }

  // ===========================================================================
  // METRICS AND CLEANUP
  // ===========================================================================

  private loadMetrics(): void {
    try {
      const savedMetrics = localStorage.getItem(this.STORAGE_KEYS.METRICS);
      if (savedMetrics) {
        this.metrics = { ...this.metrics, ...JSON.parse(savedMetrics) };
      }
      
      const savedQueue = localStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE);
      if (savedQueue) {
        this.metrics.syncQueue = JSON.parse(savedQueue);
      }
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.METRICS, JSON.stringify(this.metrics));
    } catch (error) {
      console.error('Error saving metrics:', error);
    }
  }

  private saveSyncQueue(): void {
    try {
      localStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.metrics.syncQueue));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  private cleanupLocalStorage(): void {
    // Remove old entries to free up space
    try {
      const keys = Object.keys(localStorage);
      const oldKeys = keys.filter(key => 
        key.startsWith('hybrid-') && 
        !Object.values(this.STORAGE_KEYS).includes(key)
      );
      
      oldKeys.forEach(key => localStorage.removeItem(key));
      
      // Also clean up very old sync queue items (older than 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      this.metrics.syncQueue = this.metrics.syncQueue.filter(item => 
        new Date(item.timestamp) > weekAgo
      );
      
      this.saveSyncQueue();
    } catch (error) {
      console.error('Error cleaning up localStorage:', error);
    }
  }

  // ===========================================================================
  // PUBLIC STATUS METHODS
  // ===========================================================================

  getConnectionStatus() {
    return {
      isOnline: !this.metrics.isOfflineMode && this.metrics.supabaseFailures < this.MAX_RETRIES,
      supabaseFailures: this.metrics.supabaseFailures,
      lastSuccessfulConnection: this.metrics.lastSuccessfulConnection,
      syncQueueLength: this.metrics.syncQueue.length,
      lastSyncAttempt: this.metrics.lastSyncAttempt
    };
  }

  async forceSyncNow(): Promise<boolean> {
    try {
      await this.processSyncQueue();
      return true;
    } catch (error) {
      console.error('Force sync failed:', error);
      return false;
    }
  }

  clearOfflineData(): void {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    this.metrics = {
      supabaseAttempts: 0,
      supabaseFailures: 0,
      lastSuccessfulConnection: null,
      isOfflineMode: false,
      syncQueue: [],
      lastSyncAttempt: null
    };
  }
}

// Create singleton instance
export const hybridStorage = new HybridStorageService();
export default hybridStorage;