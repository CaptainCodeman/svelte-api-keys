<script lang="ts">
	import { InMemoryTokenBucket } from 'svelte-api-keys/bucket-memory'
	import { Refill } from 'svelte-api-keys/refill'
	import { Chart, type ChartConfiguration } from 'chart.js/auto'
	import ChartStreaming from '@robloche/chartjs-plugin-streaming'
	import { enUS } from 'date-fns/locale'
	import 'chartjs-adapter-date-fns'

	let size = $state(10)
	let rate = $state(0.1)
	let count = $state(1)
	let cost = $state(1)
	let refill = $derived(new Refill(rate, size))
	let pending: { count: number, cost: number }[] = $state([])

	class TokenBucket extends InMemoryTokenBucket {
		get bucket() { return this.buckets.get('') }
	}

	const tb = new TokenBucket()

	Chart.register(ChartStreaming)

	function chart(canvas: HTMLCanvasElement) {
		const config: ChartConfiguration = {
			type: 'line',
			data: {
				datasets: [
					{
						type: 'bar',
						label: 'Requests',
						barThickness: 3,
						backgroundColor: 'rgba(248, 48, 48, 0.8)',
						borderColor: 'rgb(248, 48, 48)',
						data: [],
					},
					{
						type: 'line',
						label: 'Tokens',
						pointStyle: false,
						backgroundColor: 'rgba(54, 162, 235, 0.5)',
						borderColor: 'rgb(54, 162, 235)',
						borderWidth: 1,
						cubicInterpolationMode: 'monotone',
						fill: true,
						data: [],
					},
				]
			},
			options: {
				events: ['click'],
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: {
						position: 'bottom',
						align: 'end',
					}
				},
				scales: {
					x: {
						type: 'realtime',
						realtime: {
							duration: 20000,
							delay: 0,
							frameRate: 60,
						},
						adapters: {
							date: {
								locale: enUS,
							},
						},
						time: {
							unit: 'second',
							displayFormats: {
								minute: 'ss',
								second: 'ss',
							}
						},
					},
					y: {
						min: 0,
						suggestedMax: 20,
						position: 'right',
					}
				},
			}
		}

		// trigger initial fill
		tb.consume('', refill, 0)
		const bucket = tb.bucket!
		const chart = new Chart(canvas, config)

		async function refresh() {
			raf = window.requestAnimationFrame(refresh)

			// trigger a refill of the bucket without consuming any tokens
			await tb.consume('', refill, 0)

			// aggregate as many pending request as we can into one
			// and push any partial requests back onto the queue
			// give preference to the smallest requests
			let total = 0
			let i = 0

			for (let p of pending) {
				const { count, cost } = p

				// how many units of whole cost are available
				const units = Math.min(Math.floor((bucket.tokens - total) / cost), count)

				// we'll consume that many tokens, leaving any leftover for next time
				total += units * cost
				p.count -= units
			}

			if (total) {
				// this _should_ always be allowed as we're requesting what we know is available
				const { allowed } = await tb.consume('', refill, total)
				if (allowed) {
					// remove filled requests
					pending = pending.filter(p => p.count)
					chart.data.datasets[0].data.push({
						x: bucket.updated,
						y: total,
					})
				}
			}

			chart.data.datasets[1].data.push({
				x: bucket.updated,
				y: bucket.tokens,
			})

			chart.update('quiet')
		}

		let raf = window.requestAnimationFrame(refresh)

		return {
			destroy() {
				window.cancelAnimationFrame(raf)
				chart.destroy()
			},
		}
	}

	function enqueue() {
		pending.push({ count, cost })
		pending.sort((a, b) => a.cost - b.cost)
	}
</script>

<div class="flex items-center mt-2">
  <label for="size" class="w-32 text-sm font-medium text-gray-700">Bucket Size</label>
	<input type="number" name="size" id="size" class="w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" min="1" max="20" bind:value={size}>
</div>

<div class="flex items-center mt-2">
  <label for="rate" class="w-32 text-sm font-medium text-gray-700">Refill Rate</label>
	<input type="number" name="rate" id="rate" class="w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" min="0.1" max="5" step="0.1" bind:value={rate}>
  <span class="ml-4 text-sm font-medium text-gray-700">per Second / {Math.round(rate * 60)} per Minute</span>
</div>

<div class="flex items-center mt-2">
  <label for="rate" class="w-32 text-sm font-medium text-gray-700">Request Cost</label>
	<input type="number" name="rate" id="rate" class="w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" min="1" max="10" step="1" bind:value={cost}>
</div>

<div class="flex items-center mt-2">
  <label for="rate" class="w-32 text-sm font-medium text-gray-700">Request Count</label>
	<input type="number" name="rate" id="rate" class="w-16 rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6" min="1" max="20" step="1" bind:value={count}>
	<button class="ml-4 rounded bg-green-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600" on:click={enqueue}>Consume</button>
	<button class="ml-2 rounded bg-red-600 px-2 py-1 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:bg-red-700" on:click={() => pending = []} disabled={pending.length > 0}>Clear Pending</button>
</div>

<h2 class="mt-4 text-xl font-bold tracking-tight text-gray-700">Token Bucket</h2>
<p class="mt-1 text-base text-gray-700">Visualization of token bucket capacity and requests </p>

<div class="mt-2 w-full h-72 relative">
	<canvas use:chart></canvas>
</div>

<h2 class="mt-4 text-xl font-bold tracking-tight text-gray-700">Pending Requests</h2>
<ul>
{#each pending as { count, cost } }
	<li>
		{count} x {cost}
	</li>
{/each}
</ul>