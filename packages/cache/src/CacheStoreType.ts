export interface StoredCacheData {
  value: any
  expires?: Date
}

export interface SetCacheOptions {
  ttl?: number
}

export interface GetCacheOptions {
  ttl?: number
  fallback?(): Promise<any>
}

export interface CacheStore {
  /**
   * Save data in the cache
   */
  set(key: string, value: any, options: SetCacheOptions): Promise<void> | void

  /**
   * Get data from the cache
   */
  get(key: string): Promise<StoredCacheData>

  /**
   * Removes data from the cache
   */
  invalidate(key: string): Promise<void> | void
}

export interface OrionCache {
  /**
   * Save data in the cache
   */
  set(key: string, value: any, options?: SetCacheOptions): Promise<void> | void

  /**
   * Get data from the cache
   */
  get(key: string, options?: GetCacheOptions): Promise<StoredCacheData>

  /**
   * Removes data from the cache
   */
  invalidate(key: string): Promise<void> | void
}
