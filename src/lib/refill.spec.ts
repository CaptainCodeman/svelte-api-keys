import { Refill, SECOND, MINUTE, HOUR, DAY, WEEK } from './refill'

describe('Refill', () => {
	test.each([
		{ name: '168000 per week', refill: new Refill(168000 / WEEK), expected: 0.2777777777777778 },
		{ name: '24000 per day', refill: new Refill(24000 / DAY), expected: 0.2777777777777778 },
		{ name: '3600 per hour', refill: new Refill(3600 / HOUR), expected: 1 },
		{ name: '60 per minute', refill: new Refill(60 / MINUTE), expected: 1 },
		{ name: '1 per second', refill: new Refill(1 / SECOND), expected: 1 },
		{ name: '30 per minute', refill: new Refill(30 / MINUTE), expected: 0.5 },
		{ name: '10 per second', refill: new Refill(10 / SECOND), expected: 10 },
	])('rate: $name', ({ refill, expected }) => {
		expect(refill.rate).closeTo(expected, 0.00001)
	})

	test('rate must be > 0', () => {
		expect(() => new Refill(0)).throw('rate must be greater than 0')
		expect(() => new Refill(-1)).throw('rate must be greater than 0')
	})

	test('size', () => {
		const refill = new Refill(1 / SECOND, 10)
		expect(refill.size).eq(10)
	})

	test('size defaults to 1', () => {
		const refill = new Refill(1 / SECOND)
		expect(refill.size).eq(1)
	})

	test('size must be >= 1', () => {
		expect(() => new Refill(1 / SECOND, 0.5)).throw('size must be at least 1')
		expect(() => new Refill(1 / SECOND, -1)).throw('size must be at least 1')
	})

	test.each([
		{ value: '3600/hour', expected: new Refill(3600 / HOUR) },
		{ value: '10 / second', expected: new Refill(10 / SECOND) },
		{ value: '60 / minute, 10', expected: new Refill(60 / MINUTE, 10) },
		{ value: '360 / hour, 60', expected: new Refill(360 / HOUR, 60) },
	])('parse: $value', ({ value, expected }) => {
		const refill = Refill.parse(value)
		expect(refill).deep.eq(expected)
	})
})
