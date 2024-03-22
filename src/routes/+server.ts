import { json } from '@sveltejs/kit'
import { MINUTE, Refill } from '$lib'

const limit = new Refill(10 / MINUTE, 5)

export async function GET({ locals }) {
	const { remaining, reset } = await locals.api.has('read').approve(limit)
	return json({ limit, remaining, reset })
}

export async function PUT({ locals }) {
	const { remaining, reset } = await locals.api.has('write').approve(limit)
	return json({ limit, remaining, reset })
}
