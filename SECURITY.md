# Security policy

## Supported versions

| Version | Security updates |
| --- | --- |
| 0.1.x | Supported |
| Earlier prototypes | Not supported |

## Report a vulnerability privately

Please use
[GitHub's private vulnerability reporting form](https://github.com/ReservedSnow673/Better-Learning/security/advisories/new).
Do not open a public issue for suspected credential exposure, unsafe backup
handling, script injection, or another exploitable flaw.

Include the affected version or commit, the browser and operating system, clear
reproduction steps, expected impact, and any suggested mitigation. Remove API
keys, personal source documents, and other sensitive data from the report.

Maintainers will acknowledge the report as soon as practical, investigate it,
and coordinate disclosure after a fix is available. Please avoid public
disclosure while an accepted report is being addressed.

## Security model

Better Learning is a static, local-first browser application. It has no project
account system or application backend. Learner-provided AI and media keys are
sent directly from the browser to the selected provider. Keys stay in memory
unless the learner explicitly stores an encrypted bundle in IndexedDB.

The repository must never contain live credentials. If a key may have been
committed or shared, revoke it with the provider immediately; deleting it from
Git history is not sufficient on its own.
