import { SECOND, MINUTE, HOUR, DAY, WEEK, parseRefill } from './refill'

describe('parseRefill', () => {
	test.each([
		{ value: '168000 / week', expected: 0.2777777777777778 },
		{ value: '24000 / day', expected: 0.2777777777777778 },
		{ value: '3600 / hour', expected: 1 },
		{ value: '60 / minute', expected: 1 },
		{ value: '1 / second', expected: 1 },
		{ value: '30 / minute', expected: 0.5 },
		{ value: '10 / second', expected: 10 },
	])('rate: $name', ({ value, expected }) => {
		const refill = parseRefill(value)
		expect(refill.rate).closeTo(expected, 0.00001)
	})
})
