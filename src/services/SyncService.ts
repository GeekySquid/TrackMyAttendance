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

      console.log(`[SyncService] Starting sync for ${actions.length} actions...`);
      
      for (const action of actions) {
        const success = await this.processAction(action);
        if (success) {
          await localDb.pendingActions.delete(action.id!);
        } else {
          // If a critical failure happens (not network), we might want to skip or alert
          console.warn(`[SyncService] Action ${action.id} failed to sync, will retry later.`);
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
            result = await query.insert(action.data);
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
        console.error(`[SyncService] Supabase error for ${action.table}:`, result.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[SyncService] Process action exception:', error);
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
