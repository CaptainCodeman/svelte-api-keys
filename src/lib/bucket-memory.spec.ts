import { InMemoryTokenBucket } from './bucket-memory'
import { runTests } from './bucket.spec'

const store = new InMemoryTokenBucket()
runTests('InMemoryBucketStore', store)
