# Better Learning

<p align="center">
  <strong>Study primary sources through structured courses, office hours, and honest debate.</strong>
</p>

<p align="center">
  <a href="https://github.com/ReservedSnow673/Better-Learning/actions/workflows/ci.yml"><img alt="CI status" src="https://github.com/ReservedSnow673/Better-Learning/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-263d34"></a>
  <img alt="Local-first" src="https://img.shields.io/badge/data-local--first-dc8f73">
</p>

<p align="center">
  <img src="public/portraits/marcus-aurelius.jpg" width="150" alt="Stylized AI interpretation of Marcus Aurelius">
  <img src="public/portraits/leonardo-da-vinci.jpg" width="150" alt="Stylized AI interpretation of Leonardo da Vinci">
  <img src="public/portraits/sun-tzu.jpg" width="150" alt="Stylized AI interpretation of Sun Tzu">
</p>

Better Learning is an open-source, local-first web app for learning directly
from supplied texts. It ships with complete eight-lesson courses on Marcus
Aurelius's *Meditations*, Leonardo da Vinci's *Notebooks*, and Sun Tzu's *The
Art of War*. Every lesson combines an objective, source passage, explanation,
worked application, exercise, and answer guidance.

The full core experience works without an account or API key. Optional AI and
media connections run directly from the browser using credentials the learner
provides.

## Try it in five minutes

Prerequisites: Git and Node.js `^20.19.0` or `>=22.12.0`.

~~~sh
git clone https://github.com/ReservedSnow673/Better-Learning.git
cd Better-Learning
npm ci
npm run dev
~~~

Open the local URL printed by Vite. Then:

1. Begin a starter course and open its cited source passage.
2. Complete an exercise, save a note, and mark the lesson complete.
3. Stage a debate between two thinkers; the built-in mode needs no key.
4. Open **Create**, paste a source, and build a locally cited course.

For a focused evaluation path, see [the trial guide](docs/TRIAL_GUIDE.md).

## What works with and without a key

| Capability | No key | AI provider key | fal.ai key |
| --- | :---: | :---: | :---: |
| Starter courses, passages, and exercises | Yes | Yes | Yes |
| Notes, progress, notebook, and ZIP backups | Yes | Yes | Yes |
| TXT, Markdown, subtitle, and text-PDF course creation | Yes | Yes | Yes |
| Local BM25 search and evidence retrieval | Yes | Yes | Yes |
| Source-grounded debate | Deterministic local mode | Generated perspectives | — |
| Streaming office-hours answers | Bounded local response | Generated answer | — |
| Narrated scenes, captions, and talking avatars | — | — | Optional paid generation |

## Product principles

- **Source-grounded.** Direct quotations retain document and page, heading,
  line, or timestamp anchors. Generated claims are validated against stored
  passages where applicable.
- **Clear about interpretation.** Teacher voices and portraits are labeled as
  AI interpretations. Quotation, explanation, and modern application remain
  visually distinct.
- **Local-first.** Courses, sources, notes, progress, conversations, and cached
  media live in IndexedDB. Portable ZIP backups exclude credentials.
- **Bring your own provider.** OpenAI, Anthropic, Gemini, OpenRouter, custom
  OpenAI-compatible endpoints, and fal.ai are optional.
- **Usable across devices.** The lesson workspace becomes accessible tabs on
  smaller screens and supports keyboard navigation throughout.

## How it fits together

~~~mermaid
flowchart LR
  Source[Supplied source files] --> Parser[Browser parsing and anchors]
  Parser --> DB[(IndexedDB)]
  DB --> Search[Local BM25 retrieval]
  Search --> Course[Lessons, office hours, debates]
  Course --> Notes[Notes and progress]
  Notes --> DB
  DB --> Backup[Validated ZIP backup]
  Course -. learner chooses .-> AI[Optional AI provider]
  Course -. learner confirms .-> Media[Optional fal.ai media]
  AI --> Course
  Media --> DB
~~~

There is no Better Learning backend. The production build is a static React
application. Read [the architecture guide](docs/ARCHITECTURE.md) for storage,
trust boundaries, contracts, and extension points.

## Privacy and provider costs

Provider keys stay in memory by default. A learner may explicitly save an
AES-GCM encrypted credential bundle in IndexedDB, protected by a passphrase
derived with PBKDF2. Keys are excluded from exports, URLs, logs, and build
configuration.

When a provider is enabled, the browser sends the relevant prompt and source
context directly to that provider. Media generation shows the complete script,
requested outputs, provider sequence, and a pricing link before submission.
Provider and fal.ai usage can incur charges on the learner's own account.

See [provider setup and troubleshooting](docs/PROVIDERS.md) before enabling a
connection.

## Source ingestion and backups

Better Learning accepts pasted text, TXT, Markdown, SRT, VTT, and text-based
PDFs up to 20 MB per file. PDF pages, Markdown headings, text line ranges, and
subtitle timestamps become citation anchors. Scanned PDFs need OCR before
import; OCR is not included in this release.

Course generation parses and indexes the complete local corpus, proposes an
editable 6–10 lesson outline, retrieves evidence with BM25, and verifies direct
quotes before saving. Import validates an entire versioned backup before a
single IndexedDB transaction changes local data.

## Development

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm test` | Run unit and integration tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run lint` | Check TypeScript and React code with ESLint |
| `npm run build` | Type-check and create the static `dist` build |
| `npm run preview` | Serve the production build locally |
| `npm run test:e2e` | Run desktop and mobile Playwright journeys |

Install Playwright's Chromium build once before the browser suite:

~~~sh
npx playwright install chromium
npm run test:e2e
~~~

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), and
use the issue forms for reproducible bugs or scoped feature proposals. Please
report security concerns through the private process in
[SECURITY.md](SECURITY.md).

## Deploy to Vercel

Import the repository into Vercel and keep the detected Vite settings, or run
`vercel` from the project directory. The build command is `npm run build` and
the output directory is `dist`. The included `vercel.json` preserves deep links for
React Router.

Do not configure learner provider keys as deployment environment variables;
each learner supplies their own connection in the browser.

## Project status and scope

Version `0.1.0` is ready for public trials. The current release is English-first
and intentionally has no accounts, cloud synchronization, public uploads,
recording transcription imports, or built-in OCR. Live provider behavior also
depends on each provider's browser access rules, model availability, pricing,
and account limits.

The application is available under the [MIT License](LICENSE). Starter-source
and generated-asset details are recorded in [NOTICE.md](NOTICE.md).
