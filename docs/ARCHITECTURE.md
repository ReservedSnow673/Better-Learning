# Architecture

Better Learning is a static React application with browser-owned persistence.
The design keeps the keyless learning path independent from hosted services and
makes every optional network boundary visible to the learner.

## Runtime view

~~~mermaid
flowchart TB
  UI[React routes and components]
  Contracts[TypeScript and Zod contracts]
  Parser[Source parser]
  Retrieval[Local BM25 retrieval]
  DB[(Dexie / IndexedDB)]
  Backup[ZIP import and export]
  Providers[Optional text providers]
  Fal[Optional fal.ai queue]

  UI --> Contracts
  UI --> Parser
  Parser --> Retrieval
  Parser --> DB
  Retrieval --> UI
  UI <--> DB
  DB <--> Backup
  UI -. explicit learner action .-> Providers
  UI -. reviewed media request .-> Fal
  Fal -. job polling and assets .-> DB
~~~

Vite produces static assets. React Router handles application routes, and
vercel.json rewrites deep links to index.html.

## Main modules

| Area | Location | Responsibility |
| --- | --- | --- |
| Routes and shell | src/App.tsx, src/components/AppShell.tsx | Lazy routes, navigation, responsive layout |
| Course contracts | src/contracts.ts | Versioned Zod schemas for courses, citations, jobs, and backups |
| Starter content | src/data/courses.ts | Reviewed lesson packs and citation metadata |
| Persistence | src/lib/db.ts | Dexie schema, migrations, and local records |
| Source ingestion | src/lib/sourceParser.ts | PDF/text/Markdown/subtitle parsing and anchors |
| Retrieval | src/lib/retrieval.ts | Local BM25 ranking |
| Course building | src/lib/courseBuilder.ts | Outline, evidence selection, and quote checks |
| Providers | src/lib/providers.ts | Normalized streaming, structured output, errors, and cancellation |
| Media | src/lib/media.ts | fal.ai submission, deduplication, polling, captions, and caching |
| Portability | src/lib/backup.ts | Versioned validated ZIP export/import |
| Credential crypto | src/lib/crypto.ts | PBKDF2 key derivation and AES-GCM bundles |

## Local data model

Dexie stores notes, progress, conversations, custom courses, source documents,
indexed passages, media jobs, downloaded media assets, and preferences.
Database migrations are additive and tested.

Large binary media is stored as Uint8Array data only when the completed
provider asset can be fetched from the browser. Otherwise the media job retains
its provider URL for playback. Backups can omit binary media while preserving
the rest of the learning record.

## Source-to-course flow

1. The parser validates type and size, extracts text, and preserves source
   locations.
2. Sections and passages are stored with stable document identifiers.
3. Local summaries and BM25 search cover the supplied corpus.
4. The learner edits a proposed 6–10 lesson outline.
5. Distinct evidence is retrieved for each lesson.
6. Citation identifiers and contiguous quotations are checked against the
   stored passages.
7. The course and sources are committed in one IndexedDB transaction.

Source text is data. Instructions appearing inside it never control the parser,
retriever, or provider system prompt.

## Provider boundary

A provider configuration lives in React memory. Only provider name, model, and
endpoint preferences persist automatically. The learner can optionally encrypt
keys into IndexedDB; decrypted values return to memory for the current session.

Text adapters share one completion interface for streaming, cancellation,
usage, structured results, refusals, and normalized errors. Completed
structured output is parsed with Zod before use.

Media generation has a separate reviewed-submit flow. A content fingerprint
deduplicates matching jobs. Provider request identifiers and terminal status
persist, while failed or refused work requires a new explicit submission.

## Contract and safety invariants

- Imported URLs are limited to HTTP, HTTPS, local IndexedDB references, or
  bundled paths.
- Backup records are all validated before an atomic import transaction begins.
- Credential fields are absent from the backup contract.
- Direct course quotations must be contiguous text from the associated source.
- Partial streamed answers are cleared when a learner cancels.
- Provider errors redact the active fal.ai key before persistence.
- Dialogs trap focus, restore focus on close, and support Escape.
- The keyless path makes no paid network request.

## Verification

Vitest covers course data, parsing, PDF failure modes, retrieval, providers,
credential encryption, database migration, backups, and media recovery.
Playwright exercises the major learner journeys at desktop and mobile sizes,
including keyboard source navigation. GitHub Actions runs lint, unit tests,
production build, and end-to-end tests for every pull request and main-branch
push.

When extending the system, add schema changes before persistence code, keep
network access behind an explicit learner action, and test the failure path as
well as the successful path.
