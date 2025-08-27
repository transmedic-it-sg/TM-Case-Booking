/**
 * Offline Sync Service
 * Handles synchronization between localStorage and Supabase
 * Ensures data consistency when network connectivity is restored
 */

import { supabase } from '../lib/supabase';
import { CaseBooking, User, StatusHistory } from '../types';
import { ErrorHandler } from '../utils/errorHandler';

interface PendingSyncItem {
  id: string;
  type: 'case_create' | 'case_update' | 'case_status' | 'case_amendment' | 'user_create' | 'user_update' | 'status_history';
  data: any;
  timestamp: string;
  retries: number;
  maxRetries: number;
}

interface SyncQueueManager {
  queue: PendingSyncItem[];
  isProcessing: boolean;
  lastSync: string | null;
}

const SYNC_QUEUE_KEY = 'sync_queue';
const SYNC_STATUS_KEY = 'sync_status';
const MAX_RETRY_ATTEMPTS = 3;

class OfflineSyncService {
  private syncQueue: SyncQueueManager = {
    queue: [],
    isProcessing: false,
    lastSync: null
  };

  constructor() {
    this.loadSyncQueue();
    this.setupNetworkListeners();
    this.setupPeriodicSync();
  }

  /**
   * Initialize network connectivity listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('🌐 Network connectivity restored - starting sync');
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📴 Network connectivity lost - enabling offline mode');
    });
  }

  /**
   * Setup periodic sync attempts (every 30 seconds when online)
   */
  private setupPeriodicSync(): void {
    setInterval(() => {
      if (navigator.onLine && this.syncQueue.queue.length > 0 && !this.syncQueue.isProcessing) {
        this.processSyncQueue();
      }
    }, 30000);
  }

  /**
   * Load sync queue from localStorage
   */
  private loadSyncQueue(): void {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.syncQueue = { ...this.syncQueue, ...parsed };
      }

      const syncStatus = localStorage.getItem(SYNC_STATUS_KEY);
      if (syncStatus) {
        const { lastSync } = JSON.parse(syncStatus);
        this.syncQueue.lastSync = lastSync;
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
      this.syncQueue.queue = [];
    }
  }

  /**
   * Save sync queue to localStorage
   */
  private saveSyncQueue(): void {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify({
        queue: this.syncQueue.queue,
        isProcessing: false // Never persist processing state
      }));

      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
        lastSync: this.syncQueue.lastSync,
        queueSize: this.syncQueue.queue.length
      }));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  /**
   * Add item to sync queue
   */
  public addToSyncQueue(type: PendingSyncItem['type'], data: any): void {
    const syncItem: PendingSyncItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
      maxRetries: MAX_RETRY_ATTEMPTS
    };

    this.syncQueue.queue.push(syncItem);
    this.saveSyncQueue();

    console.log(`📝 Added ${type} to sync queue. Queue size: ${this.syncQueue.queue.length}`);

    // Try immediate sync if online
    if (navigator.onLine && !this.syncQueue.isProcessing) {
      setTimeout(() => this.processSyncQueue(), 1000);
    }
  }

  /**
   * Process all items in sync queue
   */
  public async processSyncQueue(): Promise<void> {
    if (this.syncQueue.isProcessing || this.syncQueue.queue.length === 0) {
      return;
    }

    if (!navigator.onLine) {
      console.log('📴 Cannot sync - offline mode');
      return;
    }

    this.syncQueue.isProcessing = true;
    console.log(`🔄 Processing sync queue with ${this.syncQueue.queue.length} items`);

    const processedItems: string[] = [];
    const failedItems: PendingSyncItem[] = [];

    for (const item of this.syncQueue.queue) {
      try {
        const success = await this.syncSingleItem(item);
        if (success) {
          processedItems.push(item.id);
          console.log(`✅ Successfully synced ${item.type} (${item.id})`);
        } else {
          item.retries++;
          if (item.retries >= item.maxRetries) {
            console.error(`❌ Failed to sync ${item.type} after ${item.maxRetries} attempts - removing from queue`);
            processedItems.push(item.id); // Remove from queue
          } else {
            failedItems.push(item);
            console.warn(`⚠️ Failed to sync ${item.type}, retry ${item.retries}/${item.maxRetries}`);
          }
        }
        
        // Add delay between sync operations
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`💥 Error syncing ${item.type}:`, error);
        item.retries++;
        if (item.retries < item.maxRetries) {
          failedItems.push(item);
        } else {
          processedItems.push(item.id); // Remove failed items after max retries
        }
      }
    }

    // Update queue - remove processed items, keep failed items for retry
    this.syncQueue.queue = this.syncQueue.queue.filter(item => 
      !processedItems.includes(item.id)
    );

    if (processedItems.length > 0) {
      this.syncQueue.lastSync = new Date().toISOString();
      console.log(`✅ Sync completed: ${processedItems.length} items processed, ${this.syncQueue.queue.length} remaining`);
      
      // Emit sync completion event
      window.dispatchEvent(new CustomEvent('syncCompleted', {
        detail: { 
          processedCount: processedItems.length, 
          remainingCount: this.syncQueue.queue.length 
        }
      }));
    }

    this.syncQueue.isProcessing = false;
    this.saveSyncQueue();
  }

  /**
   * Sync a single item to Supabase
   */
  private async syncSingleItem(item: PendingSyncItem): Promise<boolean> {
    const result = await ErrorHandler.executeWithRetry(
      async () => {
        switch (item.type) {
          case 'case_create':
            return await this.syncCaseCreate(item.data);
          case 'case_update':
            return await this.syncCaseUpdate(item.data);
          case 'case_status':
            return await this.syncCaseStatus(item.data);
          case 'case_amendment':
            return await this.syncCaseAmendment(item.data);
          case 'user_create':
            return await this.syncUserCreate(item.data);
          case 'user_update':
            return await this.syncUserUpdate(item.data);
          case 'status_history':
            return await this.syncStatusHistory(item.data);
          default:
            console.warn(`Unknown sync type: ${item.type}`);
            return false;
        }
      },
      {
        operation: `Sync ${item.type}`,
        userMessage: `Failed to sync ${item.type} to database`,
        showToast: false,
        showNotification: false,
        includeDetails: false,
        autoRetry: false,
        maxRetries: 1
      }
    );

    return result.success;
  }

  /**
   * Sync case creation
   */
  private async syncCaseCreate(caseData: CaseBooking): Promise<boolean> {
    try {
      const { saveSupabaseCase } = await import('../utils/supabaseCaseService');
      await saveSupabaseCase(caseData);
      
      // Remove from localStorage after successful sync
      const localCases = JSON.parse(localStorage.getItem('case-bookings') || '[]');
      const updatedCases = localCases.filter((c: CaseBooking) => c.id !== caseData.id);
      localStorage.setItem('case-bookings', JSON.stringify(updatedCases));
      
      return true;
    } catch (error) {
      console.error('Error syncing case creation:', error);
      return false;
    }
  }

  /**
   * Sync case updates
   */
  private async syncCaseUpdate(updateData: { caseId: string; updates: Partial<CaseBooking> }): Promise<boolean> {
    try {
      const { updateSupabaseCaseStatus } = await import('../utils/supabaseCaseService');
      
      // Convert the updates to the expected format
      if (updateData.updates.status) {
        await updateSupabaseCaseStatus(
          updateData.caseId,
          updateData.updates.status,
          updateData.updates.processedBy || 'system',
          'Synced from offline changes',
          updateData.updates.attachments
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error syncing case update:', error);
      return false;
    }
  }

  /**
   * Sync case status changes
   */
  private async syncCaseStatus(statusData: { caseId: string; status: string; changedBy: string; details?: string; attachments?: string[] }): Promise<boolean> {
    try {
      const { updateSupabaseCaseStatus } = await import('../utils/supabaseCaseService');
      await updateSupabaseCaseStatus(
        statusData.caseId,
        statusData.status as any,
        statusData.changedBy,
        statusData.details,
        statusData.attachments
      );
      return true;
    } catch (error) {
      console.error('Error syncing case status:', error);
      return false;
    }
  }

  /**
   * Sync case amendments
   */
  private async syncCaseAmendment(amendmentData: { caseId: string; amendments: Partial<CaseBooking>; amendedBy: string }): Promise<boolean> {
    try {
      const { amendSupabaseCase } = await import('../utils/supabaseCaseService');
      await amendSupabaseCase(amendmentData.caseId, amendmentData.amendments, amendmentData.amendedBy);
      return true;
    } catch (error) {
      console.error('Error syncing case amendment:', error);
      return false;
    }
  }

  /**
   * Sync user creation
   */
  private async syncUserCreate(userData: User): Promise<boolean> {
    try {
      const { addSupabaseUser } = await import('../utils/supabaseUserService');
      await addSupabaseUser(userData);
      return true;
    } catch (error) {
      console.error('Error syncing user creation:', error);
      return false;
    }
  }

  /**
   * Sync user updates
   */
  private async syncUserUpdate(updateData: { userId: string; userData: Partial<User> }): Promise<boolean> {
    try {
      const { updateSupabaseUser } = await import('../utils/supabaseUserService');
      await updateSupabaseUser(updateData.userId, updateData.userData);
      return true;
    } catch (error) {
      console.error('Error syncing user update:', error);
      return false;
    }
  }

  /**
   * Sync status history
   */
  private async syncStatusHistory(historyData: StatusHistory & { caseId: string }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('status_history')
        .insert([{
          case_id: historyData.caseId,
          status: historyData.status,
          processed_by: historyData.processedBy,
          timestamp: historyData.timestamp,
          details: historyData.details,
          attachments: historyData.attachments
        }]);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error syncing status history:', error);
      return false;
    }
  }

  /**
   * Clear sync queue (for testing or manual reset)
   */
  public clearSyncQueue(): void {
    this.syncQueue.queue = [];
    this.syncQueue.lastSync = null;
    this.saveSyncQueue();
    console.log('🗑️ Sync queue cleared');
  }

  /**
   * Get sync queue status
   */
  public getSyncStatus(): { queueSize: number; lastSync: string | null; isProcessing: boolean } {
    return {
      queueSize: this.syncQueue.queue.length,
      lastSync: this.syncQueue.lastSync,
      isProcessing: this.syncQueue.isProcessing
    };
  }

  /**
   * Force sync attempt
   */
  public async forcSync(): Promise<void> {
    console.log('🔄 Force sync requested');
    await this.processSyncQueue();
  }

  /**
   * Check if specific item type is in queue
   */
  public hasItemInQueue(type: PendingSyncItem['type'], dataFilter?: (data: any) => boolean): boolean {
    return this.syncQueue.queue.some(item => 
      item.type === type && (dataFilter ? dataFilter(item.data) : true)
    );
  }
}

// Create singleton instance
const offlineSyncService = new OfflineSyncService();

// Export service and types
export default offlineSyncService;
export type { PendingSyncItem, SyncQueueManager };