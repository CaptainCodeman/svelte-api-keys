import type { Refill } from './refill'

export interface BucketResult {
	allowed: boolean
	limit: number
	remaining: number
	reset: number
	policy: string
}

export interface TokenBuckets {
	consume(key: string, refill: Refill, count?: number): Promise<BucketResult>
}

export abstract class TokenBucket {
	protected abstract consume(key: string, refill: Refill, count?: number): Promise<BucketResult>

	protected apply(refill: Refill, count: number, allowed: boolean, tokens: number) {
		const limit = refill.size - tokens

		// calculate how many (whole) tokens are remaining (i.e. could be consumed immediately)
		const remaining = Math.floor(tokens)

		// calculate how many tokens, or fractions of a token, are needed for the count to be available
		const deltaNo = Math.max(count - tokens, 0)

		// calculate time until the next token is available based on refill rate
		const reset = deltaNo > 0 ? Math.ceil(deltaNo / refill.rate) : 0
		const policy = `${refill.size};w=${refill.rate}`

		return {
			allowed,
			limit,
			remaining,
			reset,
			policy,
		}
	}
}
