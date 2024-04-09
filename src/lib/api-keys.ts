import type { Handle, RequestEvent } from '@sveltejs/kit'
import { randomBytes, createHash } from 'crypto'
import basex from 'base-x'
import BadWords from 'bad-words-next'
import en from 'bad-words-next/data/en.json'
import es from 'bad-words-next/data/es.json'
import fr from 'bad-words-next/data/fr.json'
import de from 'bad-words-next/data/de.json'
import type { KeyInfoData } from './key-info'
import type { KeyStore } from './key-store'
import type { TokenBuckets } from './bucket'
import { Api } from './api'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const base62 = basex(BASE62)
const badwords = new BadWords()

badwords.add(en)
badwords.add(es)
badwords.add(fr)
badwords.add(de)

type Input = Parameters<Handle>[0]

const DEFAULT_KEY_LENGTH = 32

type CustomFn = (event: RequestEvent, key: string | null) => Promise<string | null>

interface BaseParam {
	searchParam?: string
	httpHeader?: string
	cookie?: string
	custom?: CustomFn
	key_length?: number
}

// SearchParam defines the URL searchParam to use for the API key
export interface SearchParam extends BaseParam {
	searchParam: string
}

// HttpHeader defines the Request HTTP Header to use for the API key
export interface HttpHeader extends BaseParam {
	httpHeader: string
}

// Cookie defines the Request Cookie to use for the API key
export interface Cookie extends BaseParam {
	cookie: string
}

// Custom defines a custom fn to use for the API key
// It can also be used to transform a key retrieved using one of the other methods
export interface Custom extends BaseParam {
	custom: CustomFn
}

// union type ensures that at least one option has to be set
export type Options = SearchParam | HttpHeader | Cookie | Custom

const DEFAULT_OPTIONS: Options = {
	searchParam: 'key',
	httpHeader: 'x-api-key',
	cookie: 'api-key',
}

export class ApiKeys {
	constructor(
		private readonly storage: KeyStore,
		private readonly buckets: TokenBuckets,
		private readonly options: Options = DEFAULT_OPTIONS,
	) {}

	private hashFromBytes(bytes: Uint8Array) {
		return createHash('sha256').update(bytes).digest('hex')
	}

	async generate(info: KeyInfoData) {
		let key: string
		let bytes: Buffer

		// create a key that is free of any bad words
		do {
			bytes = randomBytes(this.options.key_length ?? DEFAULT_KEY_LENGTH)
			key = base62.encode(bytes)
		} while (badwords.check(key))

		// store it using a hash of the key (so the key itself is never stored, for security)
		// note that we don't require a salt as we can guarantee sufficient entropy (unlike a user password)
		const hash = this.hashFromBytes(bytes)
		await this.storage.put(hash, info)

		// return the key and the hash
		return { key, hash }
	}

	async validate(key: string | null) {
		if (!key) return null

		const bytes = base62.decode(key)
		const hash = this.hashFromBytes(bytes)
		const data = await this.storage.get(hash)
		if (data) {
			return { hash, ...data }
		}
		return null
	}

	async remove(hash: string) {
		return await this.storage.del(hash)
	}

	async retrieve(user: string) {
		return await this.storage.list(user)
	}

	async extract(event: RequestEvent) {
		let key: string | null = null
		const request = event.request.clone()

		// cookie checked first if set
		if (this.options.cookie) {
			key = event.cookies.get(this.options.cookie) ?? null
		}

		// http header overrides cookie]
		if (this.options.httpHeader) {
			key = request.headers.get(this.options.httpHeader) || key
		}

		// search params overrides http header
		if (this.options.searchParam) {
			key = event.url.searchParams.get(this.options.searchParam) || key
		}

		if (this.options.custom) {
			key = await this.options.custom(event, key)
		}

		return key
	}

	handle = async (input: Input) => {
		const { event, resolve } = input
		const { locals } = event

		const key = await this.extract(event)
		const info = await this.validate(key)

		locals.api = new Api(event, this.buckets, key, info)

		return await resolve(event)
	}
}
