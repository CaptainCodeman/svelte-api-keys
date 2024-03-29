import { randomBytes, createHash } from 'crypto'
import basex from 'base-x'
import BadWords from 'bad-words-next'
import en from 'bad-words-next/data/en.json'
import es from 'bad-words-next/data/es.json'
import fr from 'bad-words-next/data/fr.json'
import de from 'bad-words-next/data/de.json'
import type { KeyInfoData } from './key-info'
import type { KeyStore } from './key-store'

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const base62 = basex(BASE62)
const badwords = new BadWords()

badwords.add(en)
badwords.add(es)
badwords.add(fr)
badwords.add(de)

export class KeyManager {
	constructor(
		private readonly storage: KeyStore,
		private readonly key_length = 32,
	) {}

	private hashFromBytes(bytes: Uint8Array) {
		return createHash('sha256').update(bytes).digest('hex')
	}

	async generate(info: KeyInfoData) {
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
}
