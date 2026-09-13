# Public trial guide

This guide exercises the product's main trust and learning workflows in about
ten minutes. Start in a fresh browser profile or private window if you want an
isolated trial.

## Start the app

~~~sh
npm ci
npm run dev
~~~

Open the URL printed by Vite. No account, environment file, or API key is
required.

## 1. Complete a source-grounded lesson

1. Choose **Begin course** on the library page.
2. Read the learning objective and primary-source passage.
3. Open the source citation and confirm that the quoted text appears in its
   surrounding edition context.
4. Complete the exercise and reveal the answer guidance.
5. Save a note and mark the lesson complete.
6. Reload the page. Progress and the saved note should remain.

Open **Notebook** to review the note and jump back to the lesson.

## 2. Stage a keyless debate

1. Open **Debates**.
2. Keep two different thinkers selected.
3. Choose a suggested question and select **Stage debate**.
4. Review both openings, rebuttals, closing positions, and the synthesis.
5. Follow the citation on each supported perspective.

The local mode is deterministic and bounded by the starter-course evidence. A
question outside that evidence should produce an explicit insufficient-source
response.

## 3. Build a course from your own text

1. Open **Create** and enter a teacher name.
2. Add a reusable TXT, Markdown, SRT, VTT, or text-based PDF, or paste text.
3. Describe what a learner should be able to do.
4. Choose 6–10 lessons, review the proposed outline, and build the course.
5. Open the first lesson and inspect its source anchor.

The source stays in this browser. Scanned PDFs need OCR before import.

## 4. Check portability

1. Open **Settings → Backup & restore**.
2. Export a ZIP backup.
3. In a separate browser profile, import the ZIP.
4. Confirm that notes, progress, and custom courses reappear.

Credential values are never included. Cached generated media is included only
when **Include downloaded media** is selected.

## Optional provider trial

Read [PROVIDERS.md](PROVIDERS.md), then open **Settings → AI connection**.
Choose a provider, enter a key and editable model name, and use **Check
connection**. Keys stay in memory unless you explicitly save an encrypted
credential bundle.

With a working connection, ask an in-scope office-hours question and stage a
debate. Verify that answers stream, cited source material remains distinct from
interpretation, and stopping a request clears an incomplete answer.

## Optional media trial

fal.ai generation can incur charges.

1. Add a fal.ai key under **Settings → Voice & avatars**.
2. Open a lesson and select **Listen or watch**.
3. Review the complete script and generation scope.
4. Generate narration, or narration plus avatar video.
5. Confirm sequential scene playback, captions, transcript, and source links.

A failed or refused job remains visible and is not automatically purchased
again. Matching completed work is reused.

## Finish or reset

Export a backup before clearing browser data if you want to keep the trial.
Because the app uses IndexedDB, removing site data for the local origin resets
courses, notes, progress, conversations, saved encrypted credentials, and
cached media together.
