import { createClient } from 'redis'
import { RedisTokenBucket } from './bucket-redis'
import { runTests } from './bucket.spec'

const redis = createClient()
await redis.connect()
const store = await RedisTokenBucket.create(redis)

runTests('RedisBucketStorage', store)
