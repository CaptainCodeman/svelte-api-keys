import { createClient } from 'redis'
import { TokenBucket } from './bucket'
import { Refill } from './refill'

type Redis = ReturnType<typeof createClient>

export class RedisTokenBucket extends TokenBucket {
	constructor(
		private readonly redis: Redis,
		private readonly prefix = 'bucket:',
		private readonly module = 'TokenBucket',
		private readonly fname = 'consume',
	) {
		super()
	}

	async consume(key: string, refill: Refill, count = 1) {
		const result: any[] = await this.redis.sendCommand([
			'TFCALL',
			`${this.module}.${this.fname}`,
			'0',
			this.prefix + key,
			refill.size.toString(),
			refill.rate.toString(),
			count.toString(),
		])

		let allowed = false
		let tokens = 0

		for (let i = 0; i < result.length; i += 2) {
			const key = result[i]
			const value = result[i + 1]
			switch (key) {
				case 'allowed':
					allowed = value === 1
					break
				case 'tokens':
					tokens = parseFloat(value)
					break
			}
		}

		return this.apply(refill, count, allowed, tokens)
	}

	// TODO: add option to log details
	static async create(redis: Redis, prefix = 'bucket:', module = 'TokenBucket', fname = 'consume') {
		const fn = `#!js name=${module} api_version=1.0
redis.registerFunction('${fname}', (client, key, size, rate, count) => {
	const now = Date.now()

	let bucket = client.call('hgetall', key)
	if (bucket.updated) {
		const deltaMs = now - parseInt(bucket.updated)
		const deltaNo = deltaMs * rate / 1000

		bucket.tokens = Math.min(size, parseFloat(bucket.tokens) + deltaNo)
		bucket.updated = now
	} else {
		bucket = { tokens: size, updated: now }
	}

	const allowed = bucket.tokens >= count
	if (allowed) {
		bucket.tokens -= count
	}

	// calculate how many tokens, or fractions of a token, are needed for the bucket to be full
	const deltaNo = Math.max(size - bucket.tokens, 0)

	// calculate time until the bucket is full, based on refill rate
	const expire = deltaNo > 0 ? Math.ceil(deltaNo / rate) : 0

	client.call('hset', key, 'tokens', bucket.tokens.toString(), 'updated', bucket.updated.toString())
	client.call('expire', key, expire.toString())

	return {
		allowed,
		tokens: bucket.tokens,
	}
})`
		await redis.sendCommand(['TFUNCTION', 'LOAD', 'REPLACE', fn])
		return new RedisTokenBucket(redis, prefix, module, fname)
	}
}
