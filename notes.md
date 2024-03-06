## Assumptions

Salt not needed as we're creating keys with plenty of entropy
API keys should not contain 'bad-words'
API prefixes would be _external_ to this system - use a map of prefixes -> key managers with separate storage
Limit API access based on user, not key (otherwise just create more keys ...)

## Background

https://tedspence.com/what-makes-a-good-api-key-system-c7211de5ad33
https://developer.redis.com/howtos/ratelimiting/

https://stripe.com/blog/rate-limiters
https://gist.github.com/ptarjan/e38f45f2dfe601419ca3af937fff574d
https://gist.github.com/ptarjan/e38f45f2dfe601419ca3af937fff574d#file-1-check_request_rate_limiter-rb
