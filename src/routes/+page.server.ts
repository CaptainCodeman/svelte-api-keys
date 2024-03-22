import { manager } from '../hooks.server'

export const actions = {
	generate: async ({ request }) => {
		const form = await request.formData()
		const name = form.get('name') as string
		const description = form.get('description') as string
		const user = form.get('user') as string
		const _expires = form.get('expires') as string
		const expires = _expires ? new Date(_expires) : null
		const permissions = form.getAll('permissions') as string[]

		const { key, hash } = await manager.generate({ user, expires, name, description, permissions })

		return { type: 'generate', key }
	},

	validate: async ({ request }) => {
		const form = await request.formData()
		const key = form.get('key') as string
		const info = await manager.validate(key)
		return { info }
	},

	list: async ({ request }) => {
		const form = await request.formData()
		const user = form.get('user') as string
		const infos = await manager.retrieve(user)
		return { infos }
	},
}
