<script lang="ts">
	import { enhance } from '$app/forms'
	import { web_storage } from 'svelte-web-storage'
	import type { ActionData } from './$types'

	export let form

	const permissions = ['read', 'write', 'search', 'delete']
	const tokens = web_storage('tokens', [] as any[])

	$: console.log($tokens)

	let key = ''
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
				method: 'PUT',
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

	$: handleForm(form)

	function handleForm(form: ActionData) {
		switch (form?.type) {
			case 'generate':
				const { key, hash, user, expires, name, description, permissions } = form
				$tokens = [...$tokens, { key, hash, user, expires, name, description, permissions }]
				break
			case 'delete':
				$tokens = $tokens.filter(token => token.hash !== form.hash)
				break
		}
	}

	const dateFormatter = Intl.DateTimeFormat('en', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	})
</script>

<h2 class="text-xl font-bold tracking-tight text-gray-700">Your API Keys</h2>
<p class="mt-1 text-base text-gray-700">Any API keys you have created are listed below. </p>
<ul class="mt-2 space-y-3">
	{#each $tokens as token}
		<li class="border border-gray-300 p-2 rounded-md flex gap-4">
			<div class="flex flex-col gap-2 w-24">
				<button class="w-full bg-green-600 text-white text-sm rounded-md px-2 py-1 mr-2" on:click={() => key = token.key}>use key</button>
				<form class="w-full" method="post" action="?/delete" use:enhance>
					<input type="hidden" name="hash" value={token.hash}>
					<button class="w-full bg-red-600 text-white text-sm rounded-md px-2 py-1 mr-2">delete key</button>
				</form>
			</div>
			<div>
			<h3 class="font-semibold">{token.name}</h3>
			<p class="mt-1 text-gray-700 text-sm">{token.description}, expires: {token.expires ? dateFormatter.format(new Date(token.expires)) : 'never'}</p>
			<ul class="mt-2 flex items-center gap-2">
				{#each token.permissions as permission}
				<li class="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">{permission}</li>
				{/each}
			</ul>
			</div>
		</li>
	{:else}
		<li class="text-sm text-gray-600">You have no tokens, try creating one below ...</li>
	{/each}
</ul>

<form method="post" action="?/list" use:enhance class="mt-4 space-y-2">
	<label for="user" class="w-64 text-sm font-medium leading-6 text-gray-900">Email</label>
	<div class="mt-2">
		<input
			type="email"
			name="user"
			id="user"
			class="block w-64 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
			placeholder="email address"
			data-1p-ignore
		/>
	</div>

	<button>Submit</button>
</form>

<form
	method="post"
	action="?/generate"
	class="mt-4 space-y-2"
	autocomplete="off"
	use:enhance
>
	<input type="text" name="name" placeholder="key name" required minlength="3" maxlength="100" data-1p-ignore/>
	<p>A unique name for this token. May be visible to resource owners or users with possession of the token.</p>
	<input type="text" name="description" placeholder="description" maxlength="200" />
	<p>What is the purpose of this token?</p>
	<input type="email" name="user" placeholder="email address" required data-1p-ignore/>
	<input type="date" name="expires" placeholder="expiry date" />
	<p>The token will expire on Thu, Jun 20 2024</p>
	<p>Permissions</p>
	<ul class="flex items-center gap-2">
	{#each permissions as permission}
		<li class="flex">
			<input type="checkbox" id={permission} class="peer hidden" name="permissions" value={permission}>
			<label for={permission} class="select-none cursor-pointer rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10 peer-checked:bg-purple-200 peer-checked:text-purple-900 peer-checked:border-purple-200">{permission}</label>
		</li>
	{/each}
	</ul>
	<button>Submit</button>
</form>

<form method="post" action="?/validate" use:enhance>
	<input type="text" name="key" placeholder="api key" />
	<button>Submit</button>
</form>

<pre>{JSON.stringify(form, null, 2)}</pre>

<form method="post" on:submit={onSubmit}>
	<input type="text" name="key" placeholder="api key" value={key} />
	<button>Submit</button>
</form>

<button on:click={() => (results = [])}>Clear</button>

<li>
	{#each results as result}
		<ul>{result.ts} {result.status} {JSON.stringify(result.data)}</ul>
	{/each}
</li>
