/**
 * IndexedDB Store
 *
 * Privacy-preserving local storage for emotion session data.
 * Part of PMC8969204 adapted methodology (Assumption A11).
 *
 * Features:
 * - Zero network transmission
 * - Sessions, baselines, and trajectories storage
 * - User-triggered purge capability
 * - Async/await API
 */

import type {
  EmotionSession,
  BehavioralBaseline,
  TrajectoryPoint,
} from '@/types/emotion';

const DB_NAME = 'empathLayer';
const DB_VERSION = 1;

// Store names
const STORES = {
  SESSIONS: 'sessions',
  BASELINES: 'baselines',
  TRAJECTORIES: 'trajectories',
} as const;

// Maximum records to keep
const MAX_SESSIONS = 100;
const MAX_BASELINES = 50;
const MAX_TRAJECTORY_POINTS = 1000;

class IndexedDBStore {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[IndexedDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[IndexedDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          sessionStore.createIndex('startTime', 'startTime', { unique: false });
          sessionStore.createIndex('endTime', 'endTime', { unique: false });
        }

        // Baselines store
        if (!db.objectStoreNames.contains(STORES.BASELINES)) {
          const baselineStore = db.createObjectStore(STORES.BASELINES, { keyPath: 'id', autoIncrement: true });
          baselineStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          baselineStore.createIndex('sessionStart', 'sessionStart', { unique: false });
        }

        // Trajectories store
        if (!db.objectStoreNames.contains(STORES.TRAJECTORIES)) {
          const trajectoryStore = db.createObjectStore(STORES.TRAJECTORIES, { keyPath: 'id', autoIncrement: true });
          trajectoryStore.createIndex('timestamp', 'timestamp', { unique: false });
          trajectoryStore.createIndex('sessionId', 'sessionId', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<IDBDatabase> {
    await this.init();
    if (!this.db) {
      throw new Error('[IndexedDB] Database not initialized');
    }
    return this.db;
  }

  // ============================================================================
  // Sessions
  // ============================================================================

  /**
   * Save an emotion session
   */
  async saveSession(session: EmotionSession): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readwrite');
      const store = transaction.objectStore(STORES.SESSIONS);

      const request = store.put(session);

      request.onsuccess = () => {
        // Cleanup old sessions
        this.cleanupOldSessions().catch(console.error);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get all sessions
   */
  async getSessions(): Promise<EmotionSession[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const index = store.index('startTime');

      const request = index.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get sessions in time range
   */
  async getSessionsInRange(startTime: number, endTime: number): Promise<EmotionSession[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.SESSIONS, 'readonly');
      const store = transaction.objectStore(STORES.SESSIONS);
      const index = store.index('startTime');

      const range = IDBKeyRange.bound(startTime, endTime);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old sessions (keep only MAX_SESSIONS)
   */
  private async cleanupOldSessions(): Promise<void> {
    const sessions = await this.getSessions();

    if (sessions.length <= MAX_SESSIONS) return;

    const db = await this.ensureInit();
    const sessionsToDelete = sessions
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, sessions.length - MAX_SESSIONS);

    const transaction = db.transaction(STORES.SESSIONS, 'readwrite');
    const store = transaction.objectStore(STORES.SESSIONS);

    for (const session of sessionsToDelete) {
      store.delete(session.id);
    }
  }

  // ============================================================================
  // Baselines
  // ============================================================================

  /**
   * Save a behavioral baseline
   */
  async saveBaseline(baseline: BehavioralBaseline): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BASELINES, 'readwrite');
      const store = transaction.objectStore(STORES.BASELINES);

      const request = store.put(baseline);

      request.onsuccess = () => {
        this.cleanupOldBaselines().catch(console.error);
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the latest baseline
   */
  async getLatestBaseline(): Promise<BehavioralBaseline | null> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BASELINES, 'readonly');
      const store = transaction.objectStore(STORES.BASELINES);
      const index = store.index('lastUpdated');

      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old baselines
   */
  private async cleanupOldBaselines(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.BASELINES, 'readwrite');
      const store = transaction.objectStore(STORES.BASELINES);

      const countRequest = store.count();

      countRequest.onsuccess = () => {
        if (countRequest.result <= MAX_BASELINES) {
          resolve();
          return;
        }

        const index = store.index('lastUpdated');
        const deleteCount = countRequest.result - MAX_BASELINES;
        let deleted = 0;

        const cursorRequest = index.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // ============================================================================
  // Trajectories
  // ============================================================================

  /**
   * Save trajectory points
   */
  async saveTrajectory(sessionId: string, points: TrajectoryPoint[]): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORIES, 'readwrite');
      const store = transaction.objectStore(STORES.TRAJECTORIES);

      for (const point of points) {
        store.put({ ...point, sessionId });
      }

      transaction.oncomplete = () => {
        this.cleanupOldTrajectories().catch(console.error);
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get trajectory by session ID
   */
  async getTrajectoryBySession(sessionId: string): Promise<TrajectoryPoint[]> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORIES, 'readonly');
      const store = transaction.objectStore(STORES.TRAJECTORIES);
      const index = store.index('sessionId');

      const request = index.getAll(sessionId);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Cleanup old trajectory points
   */
  private async cleanupOldTrajectories(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.TRAJECTORIES, 'readwrite');
      const store = transaction.objectStore(STORES.TRAJECTORIES);

      const countRequest = store.count();

      countRequest.onsuccess = () => {
        if (countRequest.result <= MAX_TRAJECTORY_POINTS) {
          resolve();
          return;
        }

        const index = store.index('timestamp');
        const deleteCount = countRequest.result - MAX_TRAJECTORY_POINTS;
        let deleted = 0;

        const cursorRequest = index.openCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            resolve();
          }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Purge all data (user-triggered)
   */
  async purgeAllData(): Promise<void> {
    const db = await this.ensureInit();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORES.SESSIONS, STORES.BASELINES, STORES.TRAJECTORIES],
        'readwrite'
      );

      transaction.objectStore(STORES.SESSIONS).clear();
      transaction.objectStore(STORES.BASELINES).clear();
      transaction.objectStore(STORES.TRAJECTORIES).clear();

      transaction.oncomplete = () => {
        console.log('[IndexedDB] All data purged');
        resolve();
      };

      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Get storage usage estimate
   */
  async getStorageEstimate(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// Singleton instance
export const indexedDBStore = new IndexedDBStore();

export default indexedDBStore;
