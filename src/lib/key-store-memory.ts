import type { KeyInfoData } from './key-info'
import type { KeyStore } from './key-store'

export class InMemoryKeyStore implements KeyStore {
	private keys: Map<string, KeyInfoData> = new Map()

	async put(hash: string, info: KeyInfoData) {
		this.keys.set(hash, info)
	}

	async get(hash: string) {
		return this.keys.get(hash) ?? null
	}

	async del(hash: string) {
		this.keys.delete(hash)
	}

	async list(user: string) {
		const infos = Array.from(this.keys.entries())
		return infos
			.filter(([_, info]) => info.user === user)
			.map(([hash, info]) => ({ hash, ...info }))
	}
}
