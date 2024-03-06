import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { Handler, KeyExtractor, InMemoryTokenBucket, InMemoryKeyStore, KeyManager } from '$lib'

export const manager = new KeyManager(new InMemoryKeyStore())

const bucket = new InMemoryTokenBucket()
const extractor = new KeyExtractor({
	searchParam: 'key',
	httpHeader: 'x-api-key',
	cookie: 'api_key',
	custom: async (_event, key) => {
		if (key) {
			const idx = key.indexOf('_')
			if (idx >= 0) {
				return key.substring(idx + 1)
			}
		}

		return key
	},
})

export const handleApi = new Handler(extractor, manager, bucket).handle

export const handleTiers: Handle = async ({ event, resolve }) => {
	const { locals } = event

	locals.tier = locals.api.info ? (locals.api.info.name === 'prod' ? 'premium' : 'basic') : 'free'

	return await resolve(event)
}

export const handle = sequence(handleApi, handleTiers)
