import { LruCache } from './lru-cache'

describe.only('LRUCache', () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	test('lru items evicted', () => {
		const cache = new LruCache<string>(2)
		cache.set('1', 'one')
		cache.set('2', 'two')
		cache.set('3', 'three')
		expect(cache.get('1')).undefined
		expect(cache.get('2')).eq('two')
		expect(cache.get('3')).eq('three')
	})

	test('accessed items kept', () => {
		const cache = new LruCache<string>(2)
		cache.set('1', 'one')
		expect(cache.get('1')).eq('one')
		cache.set('2', 'two')
		expect(cache.get('1')).eq('one')
		cache.set('3', 'three')
		expect(cache.get('1')).eq('one')
	})

	test('items kept up to ttl', () => {
		const cache = new LruCache<string>(2, 30 /* seconds */)
		vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 0))
		cache.set('1', 'one')
		cache.set('2', 'two')
		vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 29))
		expect(cache.get('1')).eq('one')
		expect(cache.get('2')).eq('two')
		vi.setSystemTime(new Date(2024, 0, 0, 0, 1, 0))
		expect(cache.get('1')).undefined
		expect(cache.get('2')).undefined
	})

	test('del removed item', () => {
		const cache = new LruCache<string>(2, 30 /* seconds */)
		cache.set('1', 'one')
		expect(cache.get('1')).eq('one')
		cache.del('1')
		expect(cache.get('1')).undefined
	})
})
