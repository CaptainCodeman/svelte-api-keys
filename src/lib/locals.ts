import type { Api } from './handler'

export interface ApiLocals {
	api: Api
}

declare global {
	namespace App {
		interface Locals extends ApiLocals {}
	}
}
