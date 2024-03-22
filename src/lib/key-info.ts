export interface KeyInfoData {
	user: string
	name: string
	description: string
	expires: Date | null
	permissions: string[]
}

export interface KeyInfo extends KeyInfoData {
	hash: string
}
