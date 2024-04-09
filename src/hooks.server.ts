import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { ApiKeys } from 'svelte-api-keys'

// simple, for development / demo use, is to use in-memory implementations
import { InMemoryKeyStore, InMemoryTokenBucket } from 'svelte-api-keys'

const storage = new InMemoryKeyStore()
const buckets = new InMemoryTokenBucket()

// Firestore for key storage (which will benefit from the LruCache):
/*
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { env } from '$env/dynamic/private'
import { dev } from '$app/environment'
import { FirestoreKeyStore, LruCacheKeyStore } from 'svelte-api-keys'

if (dev) {
	process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
}

const app = initializeApp({ projectId: env.FIREBASE_PROJECT_ID })
const firestore = getFirestore(app)
const storage = new LruCacheKeyStore(new FirestoreKeyStore(firestore))
*/

// Redis can be used for both key storage and token buckets (but each can be used independently)
/*
import { createClient } from 'redis'
import { RedisKeyStore, RedisTokenBucket } from 'svelte-api-keys'
import { env } from '$env/dynamic/private'

const redis = createClient({ url: env.REDIS_URL })
await redis.connect()
const storage = await RedisKeyStore.create(redis)
const buckets = await RedisTokenBucket.create(redis)
*/

export const api_keys = new ApiKeys(storage, buckets)

// simplest would be:
// export const handle = api_keys.handle

// we're giving it a different name to combine it with `sequence` ...
const handleApi = api_keys.handle

const handleTiers: Handle = async ({ event, resolve }) => {
	const { locals } = event

	// simulate usage tiers:
	// free = no key
	// premium = key name equal to 'prod'
	// basic = everything else
	locals.tier = locals.api.info ? (locals.api.info.name === 'prod' ? 'premium' : 'basic') : 'free'

	return await resolve(event)
}

export const handle = sequence(handleApi, handleTiers)
