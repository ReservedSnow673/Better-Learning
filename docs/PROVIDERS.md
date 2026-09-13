# Provider setup

Better Learning is fully usable in keyless local mode. Add a provider only when
you want newly generated office-hours answers, generated debate perspectives,
or media.

## Text providers

| Choice in Settings | API family | Default model in 0.1.0 |
| --- | --- | --- |
| OpenAI | Responses API | gpt-5-mini |
| Anthropic | Messages API | claude-sonnet-4-5 |
| Google Gemini | GenerateContent | gemini-2.5-flash |
| OpenRouter | OpenAI-compatible chat completions | openai/gpt-5-mini |
| Custom endpoint | OpenAI-compatible chat completions | local-model |

Model names are editable because account access and provider catalogs change.
The connection check sends a minimal request and reports invalid credentials,
missing models, exhausted credit or rate limits, browser access failures, and
malformed responses.

OpenAI requests set `store: false`. Gemini keys are sent in the
`x-goog-api-key` request header. Other hosted adapters use their provider's
documented authentication header. Custom endpoint URLs must use HTTP or HTTPS;
a key is optional.

## Configure a text connection

1. Open **Settings → AI connection**.
2. Choose the provider.
3. Enter the model name available to your account.
4. Add the API key, unless a custom endpoint does not require one.
5. For a custom provider, enter the base URL or full chat-completions URL.
6. Select **Check connection**.

Hosted providers must permit browser requests from the app's origin. If a
provider rejects cross-origin browser traffic, use a compatible local endpoint
while running Better Learning locally or choose another supported provider.

## Credential storage

Session-only storage is the default: keys remain in React memory and disappear
when the tab session ends.

**Remember encrypted** stores one AES-256-GCM encrypted bundle in IndexedDB.
The encryption key is derived from the entered passphrase with PBKDF2-SHA-256
and 250,000 iterations. The passphrase is not stored, and there is no recovery
mechanism. A strong, unique passphrase is still important because encrypted
browser storage does not protect a device that is already compromised.

Provider selection, model name, and custom endpoint are non-secret preferences
and may persist without storing a key. Backups always exclude credentials.

## fal.ai voice and avatar generation

The media pipeline uses:

- Kokoro American English for narration.
- Whisper for timestamped captions.
- Kling standard AI Avatar for optional portrait animation.

Generation begins only after the review dialog displays the complete outgoing
script, scope, requested outputs, provider sequence, and current-pricing link.
Avatar generation sends the selected portrait and synthetic narration to
fal.ai. Jobs, request identifiers, and safe error text persist locally so
polling can resume. Successful media is cached in IndexedDB when provider CORS
rules allow it.

## Troubleshooting

**The provider rejected this key.** Confirm that the key is active and allowed
to use the chosen model. Revoke it if it may have been exposed.

**The model is unavailable.** Replace the model field with one enabled for the
account. Defaults are conveniences, not guarantees.

**Credits or rate limit exhausted.** Check the provider account and wait or add
credit before retrying.

**The browser could not reach this provider.** Check connectivity, endpoint
scheme, and provider CORS policy. For a local server, verify that it allows the
exact Vite or deployed origin.

**A structured response was rejected.** Retry once. If it persists, use a model
with reliable JSON-schema output or report the provider/model combination.

**Media remains queued.** Keep the fal.ai key unlocked and reopen the relevant
view. Polling resumes for queued and running jobs; failed and refused jobs are
not resubmitted automatically.

Never paste keys into an issue, screenshot, source document, exported backup,
or test fixture.
