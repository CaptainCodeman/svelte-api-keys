interface Cached<T> {
	ts: number
	value: T
}

// simple LRU cache with TTL
export class LruCache<T> {
	private cache = new Map<string, Cached<T>>()
	private ttl: number

	constructor(
		private readonly maxSize = 1024, // default capacity
		ttl = 3_600, // 1 hours in seconds
	) {
		// make ttl comparisons easier by converting to ms
		this.ttl = ttl * 1000
	}

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
