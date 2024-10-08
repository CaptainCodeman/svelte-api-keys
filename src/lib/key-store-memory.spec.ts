import { ApiKeys } from './api-keys'
import { InMemoryTokenBucket } from './bucket-memory'
import { InMemoryKeyStore } from './key-store-memory'

describe('storage', () => {
	// TODO: test manager calls storage, etc...
	test('generate', async () => {
		const storage = new InMemoryKeyStore()
		const buckets = new InMemoryTokenBucket()
		const manager = new ApiKeys(storage, buckets, { searchParam: 'key' })
		const info = {
			user: '123',
			expires: new Date(2024, 11, 31, 23, 59, 59),
			name: 'test',
			description: 'something for unit testing',
			permissions: ['read'],
		}

		const { key } = await manager.generate(info)
		const loaded = await manager.validate(key)
		expect(loaded).not.null
		if (loaded) {
			const { hash, ...data } = loaded
			expect(data).deep.eq(info)
		}
		const notfound = await manager.validate('notakey')
		expect(notfound).null
	})
})
