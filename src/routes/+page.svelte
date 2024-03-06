<script lang="ts">
	import { enhance } from '$app/forms'
	import { web_storage } from 'svelte-web-storage'

	export let form

	const permissions = ['get', 'put', 'delete', 'search']
	const keys = web_storage('keys', [] as string[], { persist: false })

	let results: any[] = []

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

	async function onSubmit(e: SubmitEvent) {
		e.preventDefault()
		const form = e.target as HTMLFormElement
		const data = new FormData(form)
		const key = data.get('key') as string
		const name = data.get('name') as string
		for (let i = 0; i < 10; i++) {
			const resp = await fetch('/?key=' + key, {
				method: 'POST',
				body: JSON.stringify({ name }),
			})
			const data = resp.status === 200 ? await resp.json() : {}
			results = [{ ts: new Date(), status: resp.status, data }, ...results]
			const retryAfter = parseInt(resp.headers.get('RateLimit-Reset') || '0')
			if (retryAfter) {
				await delay(retryAfter * 1000)
			}
		}
	}
</script>

<button on:click={() => ($keys = [])}>Clear</button>

<ul>
	{#each $keys as key}
		<li>{key}</li>
	{/each}
</ul>

<form method="post" action="?/list" use:enhance class="space-y-2">
	<!--
		<label for="email" class="block text-sm font-medium leading-6 text-gray-900">Email</label>
	<div class="mt-2">
		<input
			type="email"
			name="email"
			id="email"
			class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
			placeholder="you@example.com"
		/>
	</div>
-->

	<input type="email" name="user" placeholder="email address" />
	<button>Submit</button>
</form>

<form
	method="post"
	action="?/generate"
	use:enhance={() => {
		return async ({ result, update }) => {
			if (result.type === 'success' && result.data && result.data.key) {
				const key = result.data.key
				if (typeof key === 'string') {
					$keys = [...$keys, key]
					await update({ reset: false })
				}
			}
		}
	}}
>
	<input type="text" name="name" placeholder="key name" required minlength="3" maxlength="100" />
	<input type="text" name="description" placeholder="description" maxlength="200" />
	<input type="email" name="user" placeholder="email address" required />
	<input type="date" name="expires" placeholder="expiry date" />
	{#each permissions as permission}
		<label><input type="checkbox" name="permissions" value={permission} /> {permission}</label>
	{/each}
	<button>Submit</button>
</form>

<form method="post" action="?/validate" use:enhance>
	<input type="text" name="key" placeholder="api key" />
	<button>Submit</button>
</form>

<pre>{JSON.stringify(form, null, 2)}</pre>

<form method="post" on:submit={onSubmit}>
	<input type="text" name="key" placeholder="api key" />
	<button>Submit</button>
</form>

<button on:click={() => (results = [])}>Clear</button>

<li>
	{#each results as result}
		<ul>{result.ts} {result.status} {JSON.stringify(result.data)}</ul>
	{/each}
</li>

<style>
	button {
		color: #fff;
		background-color: #393;
		padding: 4px 8px;
		border-radius: 6px;
	}
</style>
