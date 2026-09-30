import type { OfflineQueueItem } from "../types/phaseC";

const QUEUE_STORAGE_KEY = "careconnect_offline_queue";

type QueueListener = (items: OfflineQueueItem[]) => void;

class OfflineQueueService {
  private queue: OfflineQueueItem[] = [];
  private listeners: QueueListener[] = [];
  private isProcessing = false;
  private isSimulatedOffline = false;

  constructor() {
    this.loadQueue();
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        if (!this.isSimulatedOffline) {
          this.notifyListeners();
        }
      });
      window.addEventListener("offline", () => {
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
      // storage quota exceeded or private mode
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
    return (
      "idemp_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now()
    );
  }

  get isOnline(): boolean {
    if (this.isSimulatedOffline) return false;
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  setSimulatedOffline(simulated: boolean) {
    this.isSimulatedOffline = simulated;
    this.notifyListeners();
  }

  getSimulatedOffline(): boolean {
    return this.isSimulatedOffline;
  }

  getPendingCount(): number {
    return this.queue.filter(
      (item) => item.status === "PENDING" || item.status === "FAILED",
    ).length;
  }

  getQueue(): OfflineQueueItem[] {
    return [...this.queue];
  }

  enqueue(
    endpoint: string,
    method: "POST" | "PATCH" | "PUT",
    body: any,
  ): OfflineQueueItem {
    const key = body.idempotencyKey || this.generateIdempotencyKey();
    body.idempotencyKey = key;

    const item: OfflineQueueItem = {
      id:
        "queue_" +
        Date.now() +
        "_" +
        Math.random().toString(36).substring(2, 6),
      endpoint,
      method,
      body,
      idempotencyKey: key,
      timestamp: Date.now(),
      status: "PENDING",
      retryCount: 0,
    };

    this.queue.push(item);
    this.persistQueue();
    return item;
  }

  async processQueue(
    fetchExecutor: (item: OfflineQueueItem) => Promise<any>,
  ): Promise<{ processed: number; failed: number }> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return { processed: 0, failed: 0 };
    }

    this.isProcessing = true;
    let processed = 0;
    let failed = 0;

    const remainingQueue: OfflineQueueItem[] = [];

    for (const item of this.queue) {
      item.status = "SYNCING";
      this.notifyListeners();

      try {
        await fetchExecutor(item);
        processed++;
        // Item succeeded, do not retain in remainingQueue
      } catch (err) {
        failed++;
        item.status = "FAILED";
        item.retryCount += 1;
        remainingQueue.push(item);
      }
    }

    this.queue = remainingQueue;
    this.persistQueue();
    this.isProcessing = false;
    return { processed, failed };
  }

  clearQueue() {
    this.queue = [];
    this.persistQueue();
  }
}

export const offlineQueue = new OfflineQueueService();
