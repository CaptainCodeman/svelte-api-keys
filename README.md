# svelte-api-keys

Secure API Key Generation, Validation, and Rate Limiting for SvelteKit projects.

## Overview

If you have any kind of API publicly accessible on the internet then you need to protect it. You can [block unwanted bots and automated requests](https://www.npmjs.com/package/svelte-kit-bot-block) but at some point, you may receive valid requests from legitimate users ... you just don't want them making too many requests too quickly as it can overload your backend and you want to ensure availability to other users by sharing out capacity evenly.

That's where rate limiting comes in. By defining a limit for how many requests a user makes, you can protect your backend resources. If you allow anonymous requests the throttling could be based on the IP address otherwise you'll likely want to provide API keys to identify the requestor and apply the limits based on those.

Which is the second part - how do you securely generate, store, and validate these keys? How do you protect against keys being exposed? Can you link API keys to accounts and apply different limits based on the account tier that should apply? How do you actually apply the limits and send the appropriate HTTP headers and response to inform the caller when limits are applied?

These are the things this package can help with.

## Features

- ✅ Designed to integrate with SvelteKit projects with fluent API
- ✅ Generate secure API keys in Base62 format for compactness and easy copy-paste
- ✅ Avoid accidental bad-words in generated keys (taking homoglyphs into account)
- ✅ Use SHA256 hashing when storing key info, generated keys themselves are never stored
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

### Create hooks.server handler

Create a key manager instance that provides the interface to generate, store, and validate API keys. The key information can be stored in memory (for development & testing), in Redis, in Firestore, or any database you want by implementing a simple interface.

We also create a hooks `handle` function that will hook everything into the SvelteKit processing pipeline:

```ts
import {
  Handler,
  KeyExtractor,
  InMemoryTokenBucket,
  InMemoryKeyStore,
  KeyManager,
} from 'svelte-api-keys'

// the KeyExtractor allows the handler to select the API key from the request. You can define one or more methods:
// 1. searchParam key, for https://example.com/api?key=myapikey
// 2. name of an HTTP header, such as 'x-api-key'
// 3. name of a cookie to check in the request
// 4. your own custom function which can lookup or transform the key
const extractor = new KeyExtractor({ searchParam: 'key', httpHeader: 'x-api-key' })

// the token-bucket implementation will store the tokens available for each API key / client IP and endpoint group
// an in-memory implementation is suitable for less-critical single server deployments or development & testing, a
// Redis implementation is avaialable for durability and scalability
const buckets = new InMemoryTokenBucket()

// the manager is used by the handler, but will also be use when generating and listing API key info to the user
// which is why it's exported. The store is independent to the token bucket storage - the in-memory implementation
// is only suitable for development and testing, persistent implementations are available for Redis or Firestore
export const manager = new KeyManager(new InMemoryKeyStore())

// the handle function allows the API system to hook into the SvelteKit request pipeline
// it will extract the API key from the request, validate & retrieve the key info for it
// and provide a fluent API for endpoints to apply limits to
export const handle = new Handler(extractor, manager, buckets).handle
```

### Use the API in endpoints

Any request will now have an `api` object available on `locals`. This will have a `key`, and `info` property depending on whether an API Key was sent with the request and whether it was valid. It also provides a fluent API that any endpoint can use to `approve()` the request by passing in the rate limit to apply.

#### Simple Global Limit

The simplest rate-limiting just requires awaiting a call to `locals.api.approve(limit)` where `limit` is a token-bucket refill rate and size:

```ts
import { json } from '@sveltejs/kit'
import { Refill, MINUTE } from 'svelte-api-keys'
import { fetchData } from '$lib/database'

const limit = new Refill(30 / MINUTE, 10)

export async function POST({ locals }) {
  await locals.api.approve(limit)

  const data = await fetchData()

  return json(data)
}
```

The first parameter to `Refill` is the rate-per-second that the token bucket refills. Read it like a fraction - numerator per denominator. To make it easier to define them, we've provided `SECOND`, `MINUTE`, `HOUR`, `DAY`, and `WEEK` constants for the denominator. In the example above, `30 / MINUTE` would equate to a rate of 2 per second ... meaning a new token would be added every 2 seconds.

The second parameter (which is optional, and defaults to 1) is the token bucket size or capacity. This provides both the initial size when a token-bucket is created and the total capacity that the bucket will fill upto. It will then allow a burst of that number of requests without any limiting being applied, at which point the requests have to wait for tokens to be available.

If you don't want to hard-code the limits into the app, you can fetch them from a datastore or environment variables. They can be stored as a string and parsed. Note the units are case insensitive, e.g.:

```ts
import { env } from '$env/dynamic/private'
import { Refill } from 'svelte-api-keys'

// SOME_ENDPOINT_LIMIT="30 / minute, 10"
const limit = Refill.parse(env.SOME_ENDPOINT_LIMIT)

// identical to new Refill(30 / MINUTE, 10)
```

With no other parameters, this applies rate limiting globally to the app - the limit would be shared for any endpoints using it (a separate count is kept for each API key though). If the call is approved, the endpoint request will complete as normal. If there are insufficient tokens in the bucket, the server will send a `429 Too Many Requests` response to indicate that the client needs to wait. Appropriate HTTP headers will be added to each response to communicate the limits to the caller - this can be used to avoid making a request that would not be approved, by waiting for the indicated time (how long before the token bucket will refill enough to allow it).

But we can do more ...

#### Cost Per Endpoint

Not all API calls are equal, some may be more expensive and you want to account for this in the rate limiting. One easy way to do that is to just apply a different cost, or consuming more tokens from the bucket. By default, 1 token is consumed per call, but this can be overridden:

```ts
await locals.api.cost(5).approve(limit)
```

If the refill rate was 3 per second, with a size capacity of 10, this would allow 2 initial calls to be made after which they would need to wait 1⅔ seconds between each. Again, this limit would be shared, so more of the smaller cost endpoints could be called in a shorter time.

But we can do more ...

#### Independent Limit per Endpoint / Group

Maybe you want to have different independent rate limits for different endpoints or groups of endpoints? By adding a name, the token-buckets will be separated:

```ts
await locals.api.name(`comments`).approve(limit)
```

But we can do more ...

#### Check Granular Permissions

Good practice is to not give too many permissions to a single key, but instead to limit it's use for a specific purpose. When generating an API key we can define a set of permissions that it has. Then, any endpoint can include the permissions when asking for approval - if the API key info doesn't have the necessary permissions the request will be denied with a `403` response.

```ts
// require a single permission:
await locals.api.has(`get`).approve(limit)

// require a group of permissions:
await locals.api.all([`get`, 'comments']).approve(limit)

// require any permissions specified
await locals.api.all([`get`, 'read', 'search']).approve(limit)
```

But we can do more ...

#### Anonymous / Public APIs

OK, last one, I promise. If you have an anonymous endpoint, there won't be any API key provided, and no KEY info to check against, so the permission checks won't be used. But we can still apply rate limiting and allow a call to be made without a key (otherwise, a missing key would result in a `401` response and an invalid or expired key would return `403`):

```ts
await locals.api.anonymous().approve(limit)
```

All of these options can be combined into a single call:

```ts
await locals.api.name('posts').has('get').cost(2).approve(limit)
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

// create handle as before, but give it a different name:
const handleApi = new Handler(extractor, manager, bucket).handle

//
const handleTiers: Handle = async ({ event, resolve }) => {
  const { locals } = event

  // fetchTierForUser is a fictitious API that will return the appropiate tier based on the key info user
  // tip: this will benefit from an in-memory LRU + TTL cache to avoid slowing down repeated lookups
  locals.tier = await fetchTierForUser(locals.api.info)

  return await resolve(event)
}

// the handle we export is now a sequence of both of them
export const handle = sequence(handleApi, handleTiers)
```

Now our endpoints have access to a `locals.tier` value which can be used to select an appropriate token-bucket refill rate:

```ts
import { json } from '@sveltejs/kit'
import { MINUTE, Refill } from 'svelte-api-keys'
import { fetchData } from '$lib/database'

const rates = {
  basic: new Refill(10 / MINUTE, 1),
  premium: new Refill(60 / MINUTE, 20),
  enterprise: new Refill(300 / MINUTE, 60),
}

export async function POST({ locals }) {
  const { tier } = locals
  const limit = rates[tier]
  await locals.api.approve(limit)

  const data = await fetchData()

  return json(data)
}
```

Finally, should you need them for whatever reason, the `.approve(limit)` method returns details about the result of the call (which are also set as HTTP Response headers)

## TODO

To complete, plus random ideas

- [x] Package and publish
- [ ] Define languages for bad-words
- [ ] Tidy example pages, provide better key management (like github) and more varied test enpoints
- [ ] Auto apply LRU / TTL cache to KeyStore (keys are always immutable)
- [x] Implement Redis key store
- [x] Implement Firestore key store
- [ ] Check if an endpoint fails to call `.approve(limit)`
