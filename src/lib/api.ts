import { error } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'
import type { TokenBuckets } from './bucket'
import type { KeyInfo } from './key-info'
import type { Refill } from './refill'

export type ClientIP = (event: RequestEvent) => string

export class Api {
	private _name = ''
	private _cost = 1
	private _anon = false
	private _has = ''
	private _any: string[] = []
	private _all: string[] = []

	/**
	 * Number of seconds per second
	 */
	public readonly SECOND = 1

	/**
	 * Number of seconds per minute
	 */
	public readonly MINUTE = 60

	/**
	 * Number of seconds per hour
	 */
	public readonly HOUR = 3_600

	/**
	 * Number of seconds per day
	 */
	public readonly DAY = 86_400

	/**
	 * Number of seconds per week
	 */
	public readonly WEEK = 604_800

	constructor(
		private readonly event: RequestEvent,
		private readonly bucket: TokenBuckets,
		private readonly client_ip: ClientIP,
		public readonly key: string | null,
		public readonly info: KeyInfo | null,
	) {}

	/**
	 * Allow anonymous requests without any API key
	 */
	anonymous() {
		this._anon = true
		return this
	}

	/**
	 * Set the token bucket name to use for rate limiting.
	 * Each named token bucket maintains a separate rate-limit.
	 * Without a name, a single rate limit will apply across all calls.
	 *
	 * @param {string} name - the name of the token bucket
	 */
	name(name: string) {
		this._name = name
		return this
	}

	/**
	 * Set the token cost to use when rate-limiting.
	 * This is the number of tokens consumed when called.
	 *
	 * @param {number} cost - the number of tokens to consume
	 */
	cost(cost: number) {
		if (cost < 1) {
			error(500, 'API cost must be at least 1')
		}
		this._cost = cost
		return this
	}

	/**
	 * Requires that the API Key has the given permission.
	 *
	 * @param {string} permission - the permission
	 */
	has(permission: string) {
		this._has = permission
		return this
	}

	/**
	 * Requires that the API Key has _any_ of the specified permissions.
	 * This allows you to check for single or all permissions, such as
	 * `read:my-project` and `read:*` (for all projects)
	 *
	 * @param {string[]} permissions - the permissions
	 */
	any(permissions: string[]) {
		this._any = permissions
		return this
	}

	/**
	 * Requires that the API Key has _all_ of the specified permissions.
	 * This allows you to check that the caller has permissions on a hierarchy
	 * of entities.
	 *
	 * @param {string[]} permissions - the permissions
	 */
	all(permissions: string[]) {
		this._all = permissions
		return this
	}

	/**
	 * Verify the call is allowed and is within the rate limit supplied.
	 * Rate-limiting http headers are added to the response whether the
	 * request is limited or not.
	 *
	 * If the request should be denied an error will be thrown and handled
	 * by SvelteKit otherwise you can continue with generating the response.
	 *
	 * @param {Object} refill - the token bucket refill parameters
	 * @param {number} refill.rate - the refill rate in tokens per second
	 * @param {number} refill.size - the size / capacity of the token bucket
	 * @throws {HttpError} Will throw a 401 error if the request doesn't include an api key and the call is not set to be anonymous
	 * @throws {HttpError} Will throw a 403 error if the provided api key is invalid
	 * @throws {HttpError} Will throw a 403 error if the provided api key has expired
	 * @throws {HttpError} Will throw a 403 error if the provided api key lacks the required permissions
	 * @throws {HttpError} Will throw a 429 error if the rate-limit is hit
	 */
	async limit(refill: Refill) {
		if (refill.rate <= 0) throw `refill rate must be greater than 0`
		if (refill.size < 1) throw `refill size must be at least 1`
		if (refill.size < this._cost) {
			console.warn(`refill size must be at least equal to cost (${this._cost})`)
		}

		const { key, info } = this

		// if not anonymous, key must be provided
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
		const bucketPrefix = info?.user || this.client_ip(this.event)
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
