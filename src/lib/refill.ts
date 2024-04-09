// seconds per ...
export const SECOND = 1
export const MINUTE = SECOND * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const WEEK = DAY * 7

export interface Refill {
	readonly rate: number
	readonly size: number
}

// parse a string representation
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
