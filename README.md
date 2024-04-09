# svelte-api-keys

Secure API Key Generation, Validation, and Rate Limiting for SvelteKit projects. Create fine-grained access tokens to grant programatic access to your API.

## Overview

If you have any kind of API publicly accessible on the internet then you need to protect it. You can [block unwanted bots and automated requests](https://www.npmjs.com/package/svelte-kit-bot-block) but at some point, you may receive valid requests from legitimate users ... you just don't want them making too many requests too quickly as it can overload your backend and you want to ensure availability to other users by sharing out capacity evenly.

That's where rate limiting comes in. By defining a limit for how many requests a user makes, you can protect your backend resources. If you allow anonymous requests the throttling could be based on the IP address otherwise you'll likely want to provide API keys to identify the requestor and apply the limits based on those.

Which is the second part - how do you securely generate, store, and validate these keys? How do you protect against keys being exposed? Can you link API keys to accounts and apply different limits based on the account tier that should apply? How do you actually apply the limits and send the appropriate HTTP headers and response to inform the caller when limits are applied?

These are the things this package can help with.

## Features

- ✅ Designed to integrate with SvelteKit projects with fluent API
- ✅ Generate secure API keys in Base62 format for compactness and easy copy-paste
- ✅ Avoid accidental bad-words in generated keys (taking homoglyphs into account)
- ✅ Use SHA256 hashing when storing key info, generated keys themselves are never stored (display once)
- ✅ Attach name, description, permissions, and expiry to keys (for self-service management of keys)
- ✅ Extract API key from the request searchParams, HTTP headers, cookies, or use a custom function
- ✅ Validate keys and return saved info for authorization
- ✅ Authorize requests based on validated key permissions
- ✅ Easy to-implement key store interface: In-Memory, Redis, and Firestore implementations provided
- ✅ LRU Cache with TTL ensures low-overhead for high performance APIs
- ✅ Token-Bucket Rate-limiting of API requests: In-memory and Redis implementations provided
- ✅ Define different rate limits based on account tiers (e.g. basic, premium, or enterprise)

## Usage

### Installation

Add to your project using your package manager of choice (tip: [`pnpm`](https://pnpm.io/) is _excellent_):

    pnpm install svelte-api-keys

### Create a key store

The key store persists the information associated with an API key which is only ever accessed using the SHA256 hash of the key, for security purposes.

Provided implementations include an in-memory store, Firestore, and Redis. Other stores such as any popular RDBMS can be created by implementing a simple `KeyStore` interface.

We'll use `src/lib/api_keys.ts` to to store the code in all the following examples:

#### In Memory Key Store

This uses an internal `Map` which is _not_ persisted so is suitable for development, testing and demonstration purposes only!

```ts
import { InMemoryKeyStore } from 'svelte-api-keys'

const storage = new InMemoryKeyStore()
```

#### Firestore Key Store

Firestore is a popular cloud data store from Google. Use the `firebase-admin/firestore` lib to create a Firestore instance and pass it to the `FirestoreKeyStore` constructor. By default, key information is stored in a collection called `api` but this can be overridden in the constructor. To save read costs and improve performance, wrap the store in an `LruCacheKeyStore` instance:

```ts
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { FirestoreKeyStore, LruCacheKeyStore } from 'svelte-api-keys'
import { env } from '$env/dynamic/private'

const app = initializeApp({ projectId: env.FIREBASE_PROJECT_ID })
const firestore = getFirestore(app)
const storage = new LruCacheKeyStore(new FirestoreKeyStore(firestore))
```

#### Redis Key Store

Redis is a fast persistable cache and makes for an excellent store. Use the node `redis` package to create a redis client instance and pass it to the `RedisKeyStore` static `create` method, which is used to ensure a search index exists. By default, key information is stored in a hash structure with the prefix `api:` but this can be overridden in the constructor:

```ts
import { createClient } from 'redis'
import { RedisKeyStore } from 'svelte-api-keys'
import { env } from '$env/dynamic/private'

const redis = createClient({ url: env.REDIS_URL })
await redis.connect()
const storage = await RedisKeyStore.create(redis)
```

### Create a Token Bucket store

The token bucket store maintains the state of each token bucket.

Provided implementations include an in-memory store, and Redis. Other stores such as any popular RDBMS can be created by extending a base `TokenBucket` class and implementing a `consume` method.

#### In Memory Token Buckets

This uses an internal `Map` which is _not_ persisted or shared so is suitable for single-server use where potentially allowing excess requests in the event of a process restart would be acceptable, or for development, testing and demonstration purposes only!

```ts
import { InMemoryTokenBucket } from 'svelte-api-keys'

const buckets = new InMemoryTokenBucket()
```

#### Redis Token Buckets

The Redis implementation uses a server-side javascript function to handle the token bucket update logic, so Redis Stack Server is recommended. This function is created automatically when the redis client instance is passed to the `RedisTokenBucket` static `create` method. You can also override the default storage prefix (`bucket:`), module name (`TokenBucket`), and function name (`consume`) if needed.

The key store and token bucket implementations are independent of each other and can be mix-and-matched as required, but it's likely that if you're using redis you'll use the Redis implementations of both so they can be created using the same redis client instance:

```ts
import { createClient } from 'redis'
import { RedisKeyStore, RedisTokenBucket } from 'svelte-api-keys'
import { env } from '$env/dynamic/private'

const redis = createClient({ url: env.REDIS_URL })
await redis.connect()
const storage = await RedisKeyStore.create(redis)
const buckets = await RedisTokenBucket.create(redis)
```

### Create an ApiKeys Manager

The `ApiKeys` manager provides the interface to generate, validate, and manage API keys. It uses the API Key Store internally, and applies SHA256 hashing to keys for security when storing and retrieving them (you can never leak keys if you don't store them!). Normally, you should never access the key store directly - aways use the key manager to do so. When generating keys, it will ensure a key doesn't contain any 'bad words' (which could otherwise be unfortunate and embarrassing!).

The simplest use just requires the key store and token bucket implementations be passed to it:

```ts
export const api_keys = new ApiKeys(storage, buckets)
```

There is an optional parameters object that can also control it's behavior by passing:

`cookie` (default `api-key`) sets the name of a cookie to inspect for an API Key on any incoming request.

`httpHeader` (default `x-api-key`) sets the name of an http header to inspect for an API Key on any incoming request. A request containing the http header `x-api-key: my-api-key` would find the key `my-api-key` automatically. Any key found in the http header will override a key found from a cookie.

`searchParam` (default `key`) sets the name of a URL search parameter to inspect for an API Key on any incoming request. A request for `POST /my-endpoint?key=my-api-key` would find the key `my-api-key` automatically. Any key found in the search param will override a key found from an http header or cookie.

`custom` (default undefined) sets a custom key extraction & transform function that allows you to perform your own key lookups, perhaps via an existing session cookie or similar, and also allows you to transform any existing key that has been extracted using the previous settings - you might [prefix keys to indicate their usage as Stripe does](https://docs.stripe.com/docs/api/authentication) for instance. This will override all other methods if specified.

`key_length` (default 32) sets the length, in bytes, of the API key to generate. If you want shorter API keys you could consider setting it to a lower value such as 24 or 16 (but too low risks conflicts when generating new keys). Keys are converted to human-readable format using Base62 for compactness and easy copy-paste.

So as a more complete example your `src/lib/api_keys.ts` may end up looking something like this, but using whatever key store and token bucket implementations make sense for you:

```ts
import { ApiKeys, InMemoryKeyStore, InMemoryTokenBucket } from 'svelte-api-keys'

const storage = new InMemoryKeyStore()
const buckets = new InMemoryTokenBucket()

export const api_keys = new ApiKeys(storage, buckets, { searchParam: 'api-key', key_length: 16 })
```

### Hook into the SvelteKit Request

The `ApiKeys` instance we created provides a `.handle` property that can be used to hook it into the SvelteKit request pipeline. Just return this from `hooks.server.ts`:

```ts
import { api_keys } from '$lib/api_keys`

export const handle = api_keys.handle
```

If you already have a `handle` function you can chain them together using the [`sequence`](https://kit.svelte.dev/docs/modules#sveltejs-kit-hooks-sequence) helper function.

### Use the API in endpoints

Now our API Key manager is hooked into the SvelteKit pipeline, any request will have an `api` object available on `locals`. This will have a `key`, and `info` property depending on whether an API Key was sent with the request and whether it was valid. It also provides a fluent API that any endpoint can use to `limit()` the request by passing in the refill rate to apply.

#### Simple Global Limit

The simplest rate-limiting just requires awaiting a call to `locals.api.limit(rate)` where `rate` is a token-bucket refill rate and size:

```ts
import { json } from '@sveltejs/kit'
import { MINUTE } from 'svelte-api-keys'
import { fetchData } from '$lib/database'

const rate = { rate: 30 / MINUTE, size: 10 }

export async function POST({ locals }) {
  await locals.api.limit(rate)

  const data = await fetchData()

  return json(data)
}
```

The `rate` property is the rate-per-second that the token bucket refills. Read it like a fraction - numerator per denominator. To make it easier to define them, we've provided `SECOND`, `MINUTE`, `HOUR`, `DAY`, and `WEEK` constants for the denominator. In the example above, `30 / MINUTE` would equate to a rate of 0.5 per second ... meaning a new token would be added every 2 seconds.

The `size` property is the token bucket capacity. This provides both the initial size when a token-bucket is created and the total capacity that the bucket will ever fill upto. It will then allow a burst of that number of requests without any limiting being applied, at which point the requests have to wait for tokens to become available (at the refill rate).

If you don't want to hard-code the limits into the app, you can fetch them from a datastore or environment variables. They can be stored as a string and parsed. Note the units are case insensitive:

```ts
import { env } from '$env/dynamic/private'
import { parseRefill } from 'svelte-api-keys'

// SOME_ENDPOINT_RATE_LIMIT="30 / minute, 10"
const rate = parseRefill(env.SOME_ENDPOINT_RATE_LIMIT)

// identical to { rate: 30 / MINUTE, size: 10 }
```

With no other parameters, this applies rate limiting globally to the app - the limit would be shared for any endpoints using it (a separate count is kept for each API key though). If the call is approved, the endpoint request will complete as normal. If there are insufficient tokens in the bucket, the server will send a `429 Too Many Requests` response to indicate that the client needs to back-off and wait. Appropriate HTTP headers will be added to each response to communicate the limits to the caller - this can be used to avoid making a request that would not be approved, by waiting for the indicated time (how long before the token bucket will refill enough to allow it).

But we can do more ...

#### Cost Per Endpoint

Not all API calls are equal, some may be more expensive and you want to account for this in the rate limiting. One easy way to do that is to just apply a different cost - consuming more tokens from the bucket. By default, 1 token is consumed per call, but this can be overridden:

```ts
await locals.api.cost(5).limit(rate)
```

If the refill rate was 3 per second, with a size capacity of 10, this would allow 2 initial calls to be made after which they would need to wait 1⅔ seconds between each. Again, this limit would be shared, so more of the smaller cost endpoints could be called in the same period of time.

But we can do more ...

#### Independent Limit per Endpoint / Group

Maybe you want to have different independent rate limits for different endpoints or groups of endpoints? By adding a name, the token-buckets will be separated:

```ts
await locals.api.name(`comments`).limit(rate)
```

But we can do more ...

#### Check Granular Permissions

Good practice is to not give too many permissions to a single key, but instead to limit it's use for a specific purpose. When generating an API key we can define a set of permissions that it has. Then, any endpoint can include the permissions when asking for approval - if the API key info doesn't have the necessary permissions the request will be denied with a `403` response.

```ts
// require a single permission:
await locals.api.has(`get`).limit(rate)

// require a complete set of permissions:
await locals.api.all([`get`, 'comments']).limit(rate)

// require any of the permissions specified:
await locals.api.all([`get`, 'read', 'search']).limit(rate)
```

But we can do more ...

#### Anonymous / Public APIs

OK, last one, I promise. If you have an anonymous endpoint, there won't be any API key provided, and no KEY info to check against, so the permission checks won't be used. But we can still apply rate limiting and allow a call to be made without a key (otherwise, a missing key would result in a `401` response and an invalid or expired key would return `403`):

```ts
await locals.api.anonymous().limit(rate)
```

All of these options can be combined into a single call, just make sure that the `.limit(rate)` call is last:

```ts
await locals.api.name('posts').has('get').cost(2).limit(rate)
```

#### Change Limits based on tiers

Sometimes, the rate limit that should apply will depend on the user account that the key belongs to. You may have different usage tiers such as `free`, `basic`, `premium`, `enterprise`, and so on. This can be accomplished by using a `sequence` of hooks to lookup the appropriate tier based on the user (available in KEY info).

First, add the appropriate tiers to `App.Locals` in `src/app.d.ts`:

```ts
interface Locals extends ApiLocals {
  tier: 'basic' | 'premium' | 'enterprise'
}
```

Add an additional handler to `src/hooks.server.ts`:

```ts
import { sequence } from '@sveltejs/kit/hooks'
import type { Handle } from '@sveltejs/kit'
import { fetchTierForUser } from '$lib/database'
import { api_keys } from '$lib/api_keys`

// this handle could set the locals.tier based on the api.info.user
const handleTiers: Handle = async ({ event, resolve }) => {
  const { locals } = event

  // fetchTierForUser is an example API that will return the appropriate tier based on the key info user
  // tip: this would benefit from an in-memory LRU + TTL cache to avoid slowing down repeated lookups...
  locals.tier = await fetchTierForUser(locals.api.info)

  return await resolve(event)
}

// the handle we export is now a sequence of our api_keys handler and this one
export const handle = sequence(api_keys.handle, handleTiers)
```

Now our endpoints have access to a `locals.tier` value which can be used to select an appropriate token-bucket refill rate:

```ts
import { json } from '@sveltejs/kit'
import { MINUTE } from 'svelte-api-keys'
import { fetchData } from '$lib/database'

const rates = {
  basic: { rate: 10 / MINUTE, size: 1 },
  premium: { rate: 60 / MINUTE, size: 20 },
  enterprise: { rate: 300 / MINUTE, size: 60 },
}

export async function POST({ locals }) {
  const { tier } = locals
  const rate = rates[tier]
  await locals.api.limit(rate)

  const data = await fetchData()

  return json(data)
}
```

Finally, should you need them for whatever reason, the `.limit(rate)` method returns details about the result of the call which are also set as HTTP Response headers - these will allow well-behaved clients to automatically back off when they hit rate limits.

## TODO

Possible enhancements:

- Warn if an endpoint fails to call `.limit(rate)`, at least after any other api methods
- Provide a ready-to-go UI for managing keys
