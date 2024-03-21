import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { Handler, KeyExtractor, InMemoryTokenBucket, KeyManager } from '$lib'

// Firestore key store:
/*
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { FirestoreKeyStore } from '$lib'
if (dev) {
	process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
}
const app = initializeApp({ projectId: env.FIREBASE_PROJECT_ID })
const firestore = getFirestore(app)
const keyStore = new FirestoreKeyStore(firestore)
*/

// Redis key store:
/*
import { createClient } from 'redis'
import { RedisKeyStore } from '$lib'
const redis = createClient({ url: env.REDIS_URL })
await redis.connect()
const keyStore = await RedisKeyStore.create(redis)
*/

// In Memory key store:
import { InMemoryKeyStore } from '$lib'
const keyStore = new InMemoryKeyStore()

export const manager = new KeyManager(keyStore)

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
