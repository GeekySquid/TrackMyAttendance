import Dexie, { Table } from 'dexie';

/**
 * PendingAction interface
 * Stores mutations that need to be synced to Supabase when online.
 */
export interface PendingAction {
  id?: number;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC';
  data: any;
  timestamp: number;
  rpcMethod?: string;
  primaryKey?: string | number;
}

/**
 * AppDatabase class
 * Local IndexedDB storage for offline-first architecture.
 */
export class AppDatabase extends Dexie {
  profiles!: Table<any>;
  attendance!: Table<any>;
  leave_requests!: Table<any>;
  geofence_schedules!: Table<any>;
  notifications!: Table<any>;
  system_configuration!: Table<any>;
  mentors!: Table<any>;
  subscribers!: Table<any>;
  pendingActions!: Table<PendingAction>;

  constructor() {
    super('TrackMyAttendanceDB');
    this.version(3).stores({
      profiles: 'id, email',
      attendance: 'id, user_id, date',
      leave_requests: 'id, user_id',
      geofence_schedules: 'id',
      notifications: 'id, user_id',
      system_configuration: 'id',
      mentors: 'id',
      subscribers: 'id, email',
      pendingActions: '++id, table, action, timestamp'
    });
  }

  /**
   * Helper to clear all local data (useful for logout)
   */
  async clearAll() {
    await this.profiles.clear();
    await this.attendance.clear();
    await this.leave_requests.clear();
    await this.geofence_schedules.clear();
    await this.notifications.clear();
    await this.system_configuration.clear();
    await this.mentors.clear();
    await this.subscribers.clear();
    await this.pendingActions.clear();
  }
}

export const localDb = new AppDatabase();
