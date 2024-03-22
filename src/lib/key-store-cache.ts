import type { KeyInfo, KeyInfoData } from './key-info'
import type { KeyStore } from './key-store'
import { LruCache } from './lru-cache'

export class LruCacheKeyStore implements KeyStore {
	private cache: LruCache<KeyInfoData>

	constructor(
		private readonly store: KeyStore,
		maxSize = 1024, // default capacity
		ttl = 3_600, // 1 hours in seconds)
	) {
		this.cache = new LruCache<KeyInfo>(maxSize, ttl)
	}

	async put(hash: string, info: KeyInfoData) {
		this.cache.set(hash, info)
		return await this.store.put(hash, info)
	}

	async get(hash: string) {
		return this.cache.get(hash) ?? (await this.store.get(hash))
	}

	async del(hash: string) {
		this.cache.del(hash)
		await this.store.del(hash)
	}

	async list(user: string) {
		// not cacheable but will only be used occasionally
		return this.store.list(user)
	}
}
