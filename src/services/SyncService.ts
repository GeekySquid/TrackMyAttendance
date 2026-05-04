import { supabase } from '../lib/supabase';
import { localDb, PendingAction } from './OfflineDatabase';
import toast from 'react-hot-toast';

class SyncService {
  private isSyncing = false;
  private onlineStatus = navigator.onLine;

  constructor() {
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));
    
    // Start initial sync check
    this.checkAndSync();
  }

  private handleNetworkChange(isOnline: boolean) {
    this.onlineStatus = isOnline;
    if (isOnline) {
      toast.success('You are back online! Syncing data...');
      this.checkAndSync();
    } else {
      toast.error('You are offline. Actions will be saved locally.');
    }
  }

  /**
   * Main synchronization loop
   */
  public async checkAndSync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    try {
      const actions = await localDb.pendingActions.orderBy('timestamp').toArray();
      if (actions.length === 0) return;
      
      
      for (const action of actions) {
        const success = await this.processAction(action);
        if (success) {
          await localDb.pendingActions.delete(action.id!);
        } else {
          // If a critical failure happens (not network), we might want to skip or alert
          break; // Stop sync for now to avoid out-of-order execution issues
        }
      }
      
      if (actions.length > 0) {
        toast.success('Data synchronized with server.');
      }
    } catch (error) {
      console.error('[SyncService] Sync loop error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Process a single mutation against Supabase
   */
  private async processAction(action: PendingAction): Promise<boolean> {
    try {
      let result;
      
      if (action.action === 'RPC') {
        result = await supabase.rpc(action.rpcMethod!, action.data);
      } else {
        const query = supabase.from(action.table);
        
        switch (action.action) {
          case 'INSERT':
            // Use upsert for profiles to prevent 409 Conflict if profile already exists (clerk webhooks, etc.)
            if (action.table === 'profiles') {
              result = await query.upsert(action.data);
            } else {
              result = await query.insert(action.data);
            }
            break;
          case 'UPDATE':
            result = await query.update(action.data).eq('id', action.primaryKey);
            break;
          case 'DELETE':
            result = await query.delete().eq('id', action.primaryKey);
            break;
        }
      }

      if (result?.error) {
        // If the error is 404 (Not Found) for an RPC, it usually means signature mismatch.
        // We should skip these as retrying will not help.
        if (action.action === 'RPC' && result.error.code === '404') {
          console.warn('[SyncService] RPC 404 - possible signature mismatch. Skipping.', action);
          return true; // Return true to allow deletion
        }
        
        // If the error is "Duplicate Key" (23505), it means the data is already there.
        // We can treat this as a success to allow the sync queue to proceed.
        if (result.error.code === '23505') {
          return true;
        }
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SyncService] processAction exception:', error);
      return false;
    }
  }

  /**
   * Queue a new action for later synchronization
   */
  public async queueAction(action: Omit<PendingAction, 'timestamp'>) {
    const fullAction: PendingAction = {
      ...action,
      timestamp: Date.now()
    };
    
    await localDb.pendingActions.add(fullAction);
    
    // If online, try to sync immediately
    if (navigator.onLine) {
      this.checkAndSync();
    }
  }
}

export const syncService = new SyncService();
