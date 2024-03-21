import { ErrorReply, SchemaFieldTypes, createClient } from 'redis'
import type { KeyStore } from './key-store'
import type { KeyInfo } from './key-info'

type Redis = ReturnType<typeof createClient>

export class RedisKeyStore implements KeyStore {
	static async create(redis: Redis, prefix = 'api:') {
		try {
			await redis.ft.info(prefix + 'index')
		} catch (err: any) {
			if (err instanceof ErrorReply && err.message === 'Unknown index name') {
				await redis.ft.create(
					prefix + 'index',
					{
						user: SchemaFieldTypes.TAG,
						// really only the user is needed currently, but this may be useful to audit what keys exist or are near expiry
						permissions: SchemaFieldTypes.TAG,
						expires: SchemaFieldTypes.NUMERIC,
					},
					{
						ON: 'HASH',
						PREFIX: prefix,
					},
				)
			} else {
				throw err
			}
		}

		return new RedisKeyStore(redis, prefix)
	}

	private constructor(
		private readonly redis: Redis,
		private readonly prefix: string,
	) {}

	async put(hash: string, info: KeyInfo) {
		await this.redis.hSet(this.prefix + hash, {
			user: info.user,
			name: info.name,
			description: info.description,
			permissions: info.permissions.join(','),
			...(info.expires ? { expires: info.expires.getTime() / 1000 } : {}),
		})
	}

	async get(hash: string) {
		const data = await this.redis.hGetAll(this.prefix + hash)
		if (data.name === null) return null
		return {
			user: data.user,
			name: data.name,
			description: data.description,
			permissions: data.permissions.split(','),
			expires: data.expires ? new Date(parseFloat(data.expires) * 1000) : null,
		} as KeyInfo
	}

	async del(hash: string) {
		await this.redis.del(this.prefix + hash)
	}

	async list(user: string) {
		const matchPunctuation = /[,.?<>{}[\]"':;!@#$%^&()\-+=~|/\\ ]/g
		const value = user.replace(matchPunctuation, '\\$&')
		const result = await this.redis.ft.search(this.prefix + 'index', `@user:{${value}}`)
		const infos = result.documents.map((doc) => {
			const data = doc.value as Record<string, string>
			return {
				user: data.user,
				name: data.name,
				description: data.description,
				permissions: data.permissions.split(','),
				expires: data.expires ? new Date(parseFloat(data.expires) * 1000) : null,
			}
		})
		return infos
	}
}
