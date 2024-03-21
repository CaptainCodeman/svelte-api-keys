export interface KeyInfo {
	user: string
	name: string
	description: string
	expires: Date | null
	permissions: string[]
}
