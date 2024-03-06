import { randomBytes, createHash } from 'crypto'
import basex from 'base-x'
import BadWords from 'bad-words-next'
import en from 'bad-words-next/data/en.json'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const base62 = basex(BASE62)
const badwords = new BadWords({ data: en })

export interface KeyInfo {
	user: string
	name: string
	description: string
	expires: Date | null
	permissions: string[]
}

export class KeyManager {
	constructor(
		private readonly storage: KeyStore,
		private readonly key_length = 32,
	) {}

	private hashFromBytes(bytes: Uint8Array) {
		return createHash('sha256').update(bytes).digest('hex')
	}

	async generate(info: KeyInfo) {
		let key: string
		let bytes: Buffer

		// create a key that is free of any bad words
		do {
			bytes = randomBytes(this.key_length)
			key = base62.encode(bytes)
		} while (badwords.check(key))

		// store it using a hash of the key (so the key itself is never stored, for security)
		// note that we don't require a salt as we can guarantee sufficient entropy (unlike a user password)
		const hash = this.hashFromBytes(bytes)
		await this.storage.put(hash, info)

		// return the key
		return key
	}

	async validate(key: string | null) {
		if (!key) return null

		const bytes = base62.decode(key)
		const hash = this.hashFromBytes(bytes)
		return await this.storage.get(hash)
	}

	async remove(key: string) {
		const bytes = base62.decode(key)
		const hash = this.hashFromBytes(bytes)
		return await this.storage.del(hash)
	}

	async retrieve(user: string) {
		return await this.storage.list(user)
	}
}

export interface KeyStore {
	put(hash: string, info: KeyInfo): Promise<void>
	get(hash: string): Promise<KeyInfo | null>
	del(hash: string): Promise<void>
	list(user: string): Promise<KeyInfo[]>
}

export class InMemoryKeyStore implements KeyStore {
	private keys: Map<string, KeyInfo> = new Map()

	async put(hash: string, info: KeyInfo) {
		this.keys.set(hash, info)
	}

	async get(hash: string) {
		return this.keys.get(hash) ?? null
	}

	async del(hash: string) {
		this.keys.delete(hash)
	}

	async list(user: string) {
		const infos = Array.from(this.keys.values())
		return infos.filter((info) => info.user === user)
	}
}
