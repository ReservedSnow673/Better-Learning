# Contributing to Better Learning

Thank you for helping make source-based learning more useful and trustworthy.
Contributions of code, tests, accessibility fixes, documentation, and reviewed
course material are welcome.

## Before you start

Use a GitHub issue for a bug report or a scoped feature proposal. Security
issues and suspected credential exposure belong in the private process
described in [SECURITY.md](SECURITY.md).

For a small fix, you may open a pull request directly. For a larger product or
data-model change, start with an issue so the approach can be discussed before
implementation.

## Local setup

Better Learning requires Git and Node.js `^20.19.0` or `>=22.12.0`.

~~~sh
git clone https://github.com/ReservedSnow673/Better-Learning.git
cd Better-Learning
npm ci
npm run dev
~~~

The application needs no environment variables for its keyless mode. Never add
real provider credentials to source files, fixtures, screenshots, issues, or
pull requests.

## Make a reviewable change

1. Create a focused branch from main.
2. Keep the change limited to one problem or feature.
3. Add tests when behavior, contracts, parsing, persistence, or user journeys
   change.
4. Update the relevant documentation in the same pull request.
5. Run the checks below and describe the results in the pull request.

~~~sh
npm run lint
npm test
npm run build
npx playwright install chromium
npm run test:e2e
~~~

The browser suite covers desktop and mobile journeys. Run it for any change to
routing, IndexedDB behavior, course creation, settings, lessons, debates, media,
or accessibility.

## Source and teaching standards

Course material is held to a higher evidence standard than ordinary interface
copy.

- Direct quotations must match the bundled or supplied edition exactly.
- Every quotation needs a useful source identifier and page, heading, line, or
  timestamp anchor.
- Author text must be distinguished from translator, editor, and annotator
  commentary.
- Explanations, applications, generated teacher speech, and portraits must be
  identified as interpretations.
- Unsupported questions must acknowledge insufficient evidence.
- New bundled sources need a documented license or public-domain basis in
  NOTICE.md.
- Generated course material must be reviewed by a person before it is presented
  as a maintained starter course.

## Local-first and security requirements

Preserve these project boundaries unless an accepted design proposal changes
them:

- Core learning remains usable without an account or API key.
- Learner content stays in browser storage and exports only through an explicit
  action.
- Credentials never enter URLs, logs, fixtures, analytics, backups, or build
  configuration.
- Imported and generated records are validated before persistence.
- Source text is always treated as untrusted content, never as application
  instructions.
- Provider and media requests disclose what leaves the browser and when charges
  may apply.

## Pull request review

A pull request should explain the concrete learner or contributor problem, the
resulting behavior, and the verification performed. Include before/after images
for visible interface changes when they make review easier.

By contributing, you agree that your contribution is licensed under the
project's [MIT License](LICENSE) and to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
