import type { KeyInfo } from './key-info'
import type { KeyStore } from './key-store'

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
