import { test } from 'vitest'
import { MINUTE, Refill } from './refill'
import type { TokenBuckets } from './bucket'

export function runTests(name: string, store: TokenBuckets) {
	describe(name, () => {
		test('runTests', async () => {
			const refill = new Refill(30 / MINUTE, 10)

			const { limit, remaining, reset, policy } = await store.consume('', refill)

			expect(limit).eq(1)
			expect(remaining).eq(9)
			expect(reset).eq(0)
			expect(policy).eq('10;w=0.5')
		})

		// test('refill', async () => {
		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 0, 0))
		// 	const tb = new InMemoryTokenBucketStorage()
		// 	const rr = new RefillRate(10, [1, 'minute'])

		// 	tb.consume('one', rr)
		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 1, 0))
		// 	tb.consume('one', rr)
		// })

		// test('reset', async () => {
		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 0, 0))
		// 	const tb = new InMemoryTokenBucketStorage()
		// 	const rr = new RefillRate(60, [1, 'minute'])

		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 5, 0))
		// 	tb.consume('one', rr)

		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 10, 0))
		// 	tb.consume('one', rr)

		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 15, 0))
		// 	tb.consume('one', rr)

		// 	vi.setSystemTime(new Date(2024, 0, 0, 0, 0, 20, 0))
		// 	tb.consume('one', rr)
		// })
	})
}

test('', () => {})
