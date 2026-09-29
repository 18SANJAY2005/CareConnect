import type { OfflineQueueItem } from '../types';

const QUEUE_STORAGE_KEY = 'careconnect_caregiver_offline_queue';

type QueueListener = (items: OfflineQueueItem[]) => void;

class CaregiverOfflineQueueService {
  private queue: OfflineQueueItem[] = [];
  private listeners: QueueListener[] = [];
  private isProcessing = false;
  private isSimulatedOffline = false;

  constructor() {
    this.loadQueue();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        if (!this.isSimulatedOffline) {
          this.notifyListeners();
          this.processQueue();
        }
      });
      window.addEventListener('offline', () => {
        this.notifyListeners();
      });
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch {
      this.queue = [];
    }
  }

  private persistQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
    } catch {
      // Quota exceeded
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn([...this.queue]));
  }

  subscribe(fn: QueueListener) {
    this.listeners.push(fn);
    fn([...this.queue]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  generateIdempotencyKey(): string {
    return 'idemp_cg_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
  }

  get isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    this.notifyListeners();
    if (!simulated && typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue();
    }
  }

  getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  getPendingCount(): number {
    return this.queue.filter((item) => item.status === 'PENDING' || item.status === 'FAILED').length;
  }

  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  clearQueue() {
    this.queue = [];
    this.persistQueue();
  }

  enqueue(endpoint: string, method: 'POST' | 'PATCH' | 'PUT', body: any): OfflineQueueItem {
    const key = body.idempotencyKey || this.generateIdempotencyKey();
    body.idempotencyKey = key;

    const item: OfflineQueueItem = {
      id: 'queue_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      endpoint,
      method,
      body,
      idempotencyKey: key,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
    };

    this.queue.push(item);
    this.persistQueue();

    if (this.isOnline) {
      this.processQueue();
    }

    return item;
  }

  async processQueue() {
    if (this.isProcessing || !this.isOnline) return;
    this.isProcessing = true;

    try {
      const pendingItems = this.queue.filter(
        (item) => item.status === 'PENDING' || (item.status === 'FAILED' && item.retryCount < 3)
      );

      for (const item of pendingItems) {
        if (!this.isOnline) break;

        try {
          const token = localStorage.getItem('careconnect_caregiver_token');
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(item.endpoint, {
            method: item.method,
            headers,
            body: JSON.stringify(item.body),
          });

          if (response.ok) {
            item.status = 'SYNCED';
          } else {
            item.retryCount += 1;
            item.status = item.retryCount >= 3 ? 'FAILED' : 'PENDING';
            item.error = `HTTP ${response.status}`;
          }
        } catch (err: any) {
          item.retryCount += 1;
          item.status = item.retryCount >= 3 ? 'FAILED' : 'PENDING';
          item.error = err?.message || 'Network request failed';
        }
      }

      // Retain synced items for brief audit, prune after 50 items
      if (this.queue.length > 50) {
        this.queue = this.queue.filter((i) => i.status !== 'SYNCED');
      }

      this.persistQueue();
    } finally {
      this.isProcessing = false;
    }
  }
}

export const offlineQueue = new CaregiverOfflineQueueService();
