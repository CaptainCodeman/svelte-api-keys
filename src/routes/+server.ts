import { json } from '@sveltejs/kit'
import { MINUTE, Refill } from '$lib'

const rates = {
	free: new Refill(10 / MINUTE, 1),
	basic: new Refill(30 / MINUTE, 10),
	premium: new Refill(60 / MINUTE, 30),
}

export async function POST({ locals }) {
	const { tier } = locals
	const limit = rates[tier]
	const { remaining, reset } = await locals.api.anonymous().has('get').cost(1).approve(limit)

	return json({ tier, limit, remaining, reset })
}
