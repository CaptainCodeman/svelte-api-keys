/**
 * Number of seconds per second
 */
export const SECOND = 1

/**
 * Number of seconds per minute
 */
export const MINUTE = 60

/**
 * Number of seconds per hour
 */
export const HOUR = 3_600

/**
 * Number of seconds per day
 */
export const DAY = 86_400

/**
 * Number of seconds per week
 */
export const WEEK = 604_800

export interface Refill {
	readonly rate: number
	readonly size: number
}

/**
 * Parses a string representation of a refill parameter
 *
 * @param value The refill parameter string representation
 * @returns A refill object
 */
export function parseRefill(value: string) {
	const re = /(?<rate>\d+)\s*\/\s*(?<unit>second|minute|hour|day|week)\s*(,\s*(?<size>\d+))?/gi
	const result = re.exec(value)
	if (!result) {
		throw `unable to parse refill value ` + value
	}
	const numerator = parseInt(result.groups!.rate)
	const denominator = unitToDenominator(result.groups!.unit.toLowerCase())
	const size = parseInt(result.groups!.size ?? '1')

	return { rate: numerator / denominator, size }
}

function unitToDenominator(unit: string) {
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
