import type { Api } from './api'

export interface ApiLocals {
	api: Api
}

declare global {
	namespace App {
		interface Locals extends ApiLocals {}
	}
}
