import { error } from '@sveltejs/kit'
import type { Handle, RequestEvent } from '@sveltejs/kit'
import type { KeyExtractor } from './key-extractor'
import type { KeyManager } from './key-manager'
import type { TokenBuckets } from './bucket'
import type { Refill } from './refill'
import type { KeyInfo } from './key-info'

type Input = Parameters<Handle>[0]

export class Handler {
	constructor(
		private readonly extractor: KeyExtractor,
		private readonly manager: KeyManager,
		private readonly bucket: TokenBuckets,
	) {}

	handle = async (input: Input) => {
		const { event, resolve } = input
		const { locals } = event

		const key = await this.extractor.extract(event)
		const info = await this.manager.validate(key)

		locals.api = new Api(event, this.bucket, key, info)

		return await resolve(event)
	}
}

export class Api {
	private _name = ''
	private _cost = 1
	private _anon = false
	private _has = ''
	private _any: string[] = []
	private _all: string[] = []

	constructor(
		private readonly event: RequestEvent,
		private readonly bucket: TokenBuckets,
		public readonly key: string | null,
		public readonly info: KeyInfo | null,
	) {}

	anonymous() {
		this._anon = true
		return this
	}

	name(name: string) {
		this._name = name
		return this
	}

	cost(cost: number) {
		if (cost < 1) {
			error(500, 'API cost must be at least 1')
		}
		this._cost = cost
		return this
	}

	has(permission: string) {
		this._has = permission
		return this
	}

	any(permissions: string[]) {
		this._any = permissions
		return this
	}

	all(permissions: string[]) {
		this._all = permissions
		return this
	}

	async limit(refill: Refill) {
		const { key, info } = this

		// if not anonymouse, key must be provided
		if (!this._anon && !key) {
			error(401, 'Missing API Key')
		}

		// if key was provided, it must be valid
		if (key && !this.info) {
			error(403, 'Invalid API Key')
		}

		// if key matched a valid info
		if (info) {
			// it must be unexpired
			if (info.expires && info.expires.getTime() < Date.now()) {
				error(403, 'API Key Expired')
			}

			// it must have single specified permission
			if (this._has.length && !info.permissions.includes(this._has)) {
				error(403, 'Missing Permission: ' + this._has)
			}

			// it must have all specified permissions
			if (
				this._all.length &&
				!this._all.every((permission) => info.permissions.includes(permission))
			) {
				const missing = this._all
					.filter((permission) => !info.permissions.includes(permission))
					.join(', ')
				error(403, 'Missing Permissions: ' + missing)
			}

			// it must have any specified permissions
			if (
				this._any.length &&
				!this._any.some((permission) => info.permissions.includes(permission))
			) {
				const missing = this._any.join(', ')
				error(403, 'Missing any Permission: ' + missing)
			}
		}

		// TODO: hash client IP address (?)
		const bucketPrefix = info?.user || this.event.getClientAddress()
		const bucketKey = bucketPrefix + ':' + this._name

		// apply rate limiting
		const result = await this.bucket.consume(bucketKey, refill, this._cost)

		// set rate limiting http headers to inform client whether it needs to wait
		// https://medium.com/@guillaume.viguierjust/rate-limiting-your-restful-api-3148f8e77248
		// https://www.useanvil.com/blog/engineering/throttling-and-consuming-apis-with-429-rate-limits/
		this.event.setHeaders({
			'RateLimit-Limit': result.limit.toString(),
			'RateLimit-Remaining': result.remaining.toString(),
			'RateLimit-Reset': result.reset.toString(),
			'RateLimit-Policy': result.policy,
		})

		// if not allowed, block access
		if (!result.allowed) {
			error(429, 'Too Many Requests')
		}

		return result
	}
}
