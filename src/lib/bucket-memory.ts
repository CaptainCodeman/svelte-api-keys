import { TokenBucket } from './bucket'
import type { Refill } from './refill'

export class InMemoryTokenBucket extends TokenBucket {
	protected readonly buckets = new Map<string, { tokens: number; updated: number }>()

	async consume(key: string, refill: Refill, count = 1) {
		const now = Date.now()

		let bucket = this.buckets.get(key)
		if (!bucket) {
			bucket = { tokens: refill.size, updated: now }
			this.buckets.set(key, bucket)
		}

		const deltaMs = now - bucket.updated
		const deltaNo = (deltaMs * refill.rate) / 1000

		bucket.tokens = Math.min(refill.size, bucket.tokens + deltaNo)
		bucket.updated = now

		const allowed = bucket.tokens >= count
		if (allowed) {
			bucket.tokens -= count
		}

		return this.apply(refill, count, allowed, bucket.tokens)
	}
}
