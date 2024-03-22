import type { KeyInfo, KeyInfoData } from './key-info'

export interface KeyStore {
	put(hash: string, info: KeyInfoData): Promise<void>
	get(hash: string): Promise<KeyInfoData | null>
	del(hash: string): Promise<void>
	list(user: string): Promise<KeyInfo[]>
}
