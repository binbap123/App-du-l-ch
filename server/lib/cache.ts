/** LRU cache in-memory có TTL. Mất khi server restart — chấp nhận được với free hosting. */
export class TTLCache<V> {
  private store = new Map<string, { value: V; expiresAt: number }>();

  constructor(private maxEntries = 500, private defaultTtlMs = 24 * 60 * 60 * 1000) {}

  get(key: string): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: string, value: V, ttlMs = this.defaultTtlMs): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

/** Chuẩn hoá chuỗi để làm cache key: lowercase, bỏ dấu, gộp khoảng trắng. */
export function normalizeKey(...parts: Array<string | number | undefined | null>): string {
  return parts
    .map((p) =>
      String(p ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/đ/g, "d")
        .replace(/\s+/g, " ")
        .trim()
    )
    .join("|");
}
