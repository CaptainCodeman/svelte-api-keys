import type { RequestEvent } from '@sveltejs/kit'

type CustomFn = (event: RequestEvent, key: string | null) => Promise<string | null>

// SearchParam defines the URL searchParam to use for the API key
export interface SearchParam {
	searchParam: string
	httpHeader?: string
	cookie?: string
	custom?: CustomFn
}

// HttpHeader defines the Request HTTP Header to use for the API key
export interface HttpHeader {
	searchParam?: string
	httpHeader: string
	cookie?: string
	custom?: CustomFn
}

// Cookie defines the Request Cookie to use for the API key
export interface Cookie {
	searchParam?: string
	httpHeader?: string
	cookie: string
	custom?: CustomFn
}

// Custom defines a custom fn to use for the API key
// It can also be used to transform a key retrieved using one of the other methods
export interface Custom {
	searchParam?: string
	httpHeader?: string
	cookie?: string
	custom: CustomFn
}

// union type ensures that at least one option has to be set
export type Options = SearchParam | HttpHeader | Cookie | Custom

// KeyExtractor extracts the key from a SvelteKit event
export class KeyExtractor {
	constructor(private readonly options: Options) {}

	async extract(event: RequestEvent) {
		let key: string | null = null
		const request = event.request.clone()

		// cookie checked first if set
		if (this.options.cookie) {
			key = event.cookies.get(this.options.cookie) ?? null
		}

		// http header overrides cookie]
		if (this.options.httpHeader) {
			key = request.headers.get(this.options.httpHeader) || key
		}

		// search params overrides http header
		if (this.options.searchParam) {
			key = event.url.searchParams.get(this.options.searchParam) || key
		}

		if (this.options.custom) {
			key = await this.options.custom(event, key)
		}

		return key
	}
}
