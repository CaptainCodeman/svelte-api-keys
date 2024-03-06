// seconds per ...
export const SECOND = 1
export const MINUTE = SECOND * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const WEEK = DAY * 7

/**
 * Refill represents a token bucket refill rate and size
 */
export class Refill {
	/**
	 * Create a Refill instance
	 *
	 * @param rate Refill rate per second
	 * @param size Total size (burst capacity)
	 */
	constructor(
		public readonly rate: number,
		public readonly size: number = 1,
	) {
		if (rate <= 0) throw `rate must be greater than 0`
		if (size < 1) throw `size must be at least 1`
	}

	// parse a string representation
	static parse(value: string) {
		const re = /(?<rate>\d+)\s*\/\s*(?<unit>second|minute|hour|day|week)\s*(,\s*(?<size>\d+))?/gi
		const result = re.exec(value)
		if (!result) {
			throw `unable to parse refill value ` + value
		}
		const numerator = parseInt(result.groups!.rate)
		const denominator = Refill.unitToDenominator(result.groups!.unit.toLowerCase())
		const size = parseInt(result.groups!.size ?? '1')

		return new Refill(numerator / denominator, size)
	}

	private static unitToDenominator(unit: string) {
		switch (unit) {
			case 'second':
				return SECOND
			case 'minute':
				return MINUTE
			case 'hour':
				return HOUR
			case 'day':
				return DAY
			case 'week':
				return WEEK
			default:
				throw `unexpected unit`
		}
	}
}
