interface Cached<T> {
	ts: number
	value: T
}

// simple LRU cache with TTL
export class LruCache<T> {
	private cache: Map<string, Cached<T>>

	constructor(
		private readonly maxSize = 1024, // default capacity
		private readonly ttl = 3_600_000, // 1 hours in ms
	) {}

	get(key: string): T | undefined {
		const item = this.cache.get(key)
		if (item) {
			const { ts, value } = item
			// check it hasn't expired
			if (ts > Date.now() - this.ttl) {
				// reinsert to mark as most recently used
				this.cache.delete(key)
				this.cache.set(key, item)
				return value
			} else {
				// if expired, remove it
				this.cache.delete(key)
			}
		}
		return undefined
	}

	set(key: string, value: T) {
		if (this.cache.size >= this.maxSize) {
			// delete the least recently used key
			this.cache.delete(this.cache.keys().next().value)
		}
		return this.cache.set(key, { ts: Date.now(), value })
	}

	del(key: string) {
		this.cache.delete(key)
	}
}
