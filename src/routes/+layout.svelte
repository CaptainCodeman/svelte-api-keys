<script>
	import '../app.pcss'
</script>

<nav class="m-4">
	<h1 class="text-3xl font-extrabold tracking-tighter text-gray-600">svelte-api-keys</h1>
	<p class="mt-1 text-gray-700">
		Generate, Validate, Authorize and Rate-Limit API keys for your SvelteKit endpoints.
	</p>
	<!-- <ul class="mt-2 flex gap-2 text-xs">
		<li><a class="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md" href="/">Keys</a></li>
		<li><a class="px-2 py-2 bg-gray-100 hover:bg-gray-200 rounded-md" href="/chart">Bucket</a></li>
	</ul> -->
</nav>

<main class="m-4">
	<slot />
</main>
