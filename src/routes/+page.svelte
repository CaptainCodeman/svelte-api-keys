<script lang="ts">
	import { enhance } from '$app/forms'
	import { web_storage } from 'svelte-web-storage'
	import type { ActionData } from './$types'

	export let form

	const permissions = ['read', 'write']
	const tokens = web_storage('tokens', [] as any[])

	let key = ''
	let pending: any[] = []
	let results: any[] = []

	const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

	function onSubmit(e: SubmitEvent) {
		e.preventDefault()

		const form = e.target as HTMLFormElement
		const data = new FormData(form)
		const key = data.get('key') as string
		const count = parseInt(data.get('count') as string)
		const method = data.get('method') as string
		const endpoint = data.get('endpoint') as string

		// add requests to pending queue
		for (let i = 0; i < count; i++) {
			pending = [...pending, { key, method, endpoint }]
		}

		// start processing if not already running
		if (pending.length === count) process()
	}

	async function process() {
		if (pending.length === 0) return

		const req = pending[0]
		const { key, method, endpoint } = req
		const resp = await fetch(`/${endpoint}?key=${key}`, { method, body: method === 'put' ? '{}' : null })
		const data = await resp.json()
		// const data = resp.status === 200 ? await resp.json() : {}
		results = [{ ts: new Date(), method, endpoint, status: resp.status, data }, ...results]
		if (resp.status !== 429) {
			pending = pending.filter(p => p !== req)
		}

		const retryAfter = parseInt(resp.headers.get('RateLimit-Reset') || '0')
		if (retryAfter) {
			await delay(retryAfter * 1000)
		}

		process()
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

<svelte:head>
	<title>API Keys</title>
</svelte:head>

<h2 class="text-xl font-bold tracking-tight text-gray-700">Key Management</h2>
<p class="mt-1 text-base text-gray-700">Any API keys you have created are listed below.</p>

<ul class="mt-2 grid grid-cols-3 gap-2">
	{#each $tokens as token}
		<li class="border border-gray-300 p-2 rounded-md flex gap-4">
			<div class="flex flex-col gap-2 w-24">
				<button class="w-full bg-green-600 text-white text-sm rounded-md px-2 py-1 mr-2" on:click={() => key = token.key}>use</button>
				<form class="w-full" method="post" action="?/delete" use:enhance>
					<input type="hidden" name="hash" value={token.hash}>
					<button class="w-full bg-red-600 text-white text-sm rounded-md px-2 py-1 mr-2">delete</button>
				</form>
			</div>
			<div>
			<h3 class="font-semibold">{token.name}</h3>
			<p class="mt-1 text-gray-700 text-sm">{token.description}</p>
			<p class="mt-1 text-gray-700 text-sm">expires: {token.expires ? dateFormatter.format(new Date(token.expires)) : 'never'}</p>
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

<!-- <pre class="text-xs mt-4">response: {JSON.stringify(form, null, 2)}</pre> -->

<h2 class="mt-4 text-md font-semibold tracking-tight text-gray-700">Create New Key</h2>
<form
	method="post"
	action="?/generate"
	class="mt-2 flex items-center gap-2"
	autocomplete="off"
	use:enhance
>
	<input class="block w-32 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" type="text" name="name" placeholder="key name" required minlength="3" maxlength="100" data-1p-ignore/>
	<input class="block w-64 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" type="text" name="description" placeholder="description" maxlength="200" />
	<input class="block w-48 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" type="email" name="user" placeholder="email address" required data-1p-ignore/>
	<input class="block w-36 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" type="date" name="expires" placeholder="expiry date" />
	<ul class="flex items-center gap-2">
	{#each permissions as permission}
		<li class="flex">
			<input type="checkbox" id={permission} class="peer hidden" name="permissions" value={permission}>
			<label for={permission} class="select-none cursor-pointer rounded-md bg-gray-50 px-2 py-2 text-xs font-medium text-gray-700 ring-1 ring-inset ring-gray-700/10 peer-checked:bg-green-200 peer-checked:text-green-900 peer-checked:border-green-200">{permission}</label>
		</li>
	{/each}
	</ul>
	<button type="submit" class="ml-2 rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Create Key</button>
</form>

{#if form?.type === 'generate'}
	<pre class="mt-2 text-xs">{JSON.stringify(form, null, 2)}</pre>
{/if}

<h2 class="mt-4 text-md font-semibold tracking-tight text-gray-700">Find Keys by Owner</h2>
<form method="post" action="?/list" use:enhance class="mt-2 flex items-center gap-2">
	<div class="">
		<input
			type="email"
			name="user"
			id="user"
			class="block w-64 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
			placeholder="email address"
			data-1p-ignore
		/>
	</div>

	<button type="submit" class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">List Keys</button>
</form>

{#if form?.type === 'list'}
	<pre class="mt-2 text-xs">{JSON.stringify(form, null, 2)}</pre>
{/if}

<h2 class="mt-4 text-md font-semibold tracking-tight text-gray-700">Retrieve Key Info</h2>
<form method="post" action="?/validate" use:enhance class="mt-2 flex items-center gap-2">
	<input
		type="text"
		name="key"
		id="key"
		class="block w-96 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
		placeholder="api key"
		value={key}
		data-1p-ignore
	/>
	<button type="submit" class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Get Info</button>
</form>

{#if form?.type === 'validate'}
	<pre class="mt-2 text-xs">{JSON.stringify(form, null, 2)}</pre>
{/if}

<h2 class="mt-4 text-md font-semibold tracking-tight text-gray-700">Call API</h2>
<form method="post" on:submit={onSubmit} class="mt-2 flex items-center gap-2">
	<input
		type="text"
		name="key"
		id="key"
		class="block w-96 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
		placeholder="api key"
		value={key}
		data-1p-ignore
	/>
	<input class="block w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" type="number" name="count" value="1" min="1" max="20" />
	<select name="method" class="block w-24 rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
    <option selected>get</option>
    <option>put</option>
  </select>
	<input type="hidden" name="endpoint" value="cheap">
	<!--
	<label class="flex items-center gap-1 ml-4">
		<input type="radio" name="endpoint" value="cheap">
		Cheap
	</label>
	<label class="flex items-center gap-1">
		<input type="radio" name="endpoint" value="expensive">
		Expensive
	</label>
	-->
	<button type="submit" class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">Submit Requests</button>
	<button type="button" class="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50" on:click={() => {pending = []; form = null; key = '' }}>Clear</button>
</form>

<p class="mt-2 text-xs">Pending: {pending.length}</p>

<ul class="mt-2 text-xs">
	{#each results as result}
		<li>{result.ts.getTime() / 1000} {result.method} {result.status} {JSON.stringify(result.data)}</li>
	{/each}
</ul>
