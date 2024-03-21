import type { KeyInfo } from './key-info'

export interface KeyStore {
	put(hash: string, info: KeyInfo): Promise<void>
	get(hash: string): Promise<KeyInfo | null>
	del(hash: string): Promise<void>
	list(user: string): Promise<KeyInfo[]>
}
