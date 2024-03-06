// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			tier: 'free' | 'basic' | 'premium'
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
