# Security Policy

Watchtower stores SSH private keys (encrypted at rest) and connects to your
servers. We take vulnerability reports seriously.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's private vulnerability reporting: go to the repository's
**Security** tab and choose **Report a vulnerability**. If that is unavailable,
email the maintainer at <ctech1699@gmail.com> with the subject
`Watchtower security`.

Include what you found, how to reproduce it, and the version or commit you
tested. You should get an acknowledgement within a few days. Fixes are
coordinated with you before details are made public.

## Scope

In scope: authentication and session handling, tenant (project) isolation,
SSH key storage and handling, host key verification, command execution paths,
the API-key system, and the Docker images and compose file in this repo.

Out of scope: vulnerabilities in your own infrastructure, issues that require
an already-compromised host or master key, and findings about the
documented trade-offs in [docs/SSH_SECURITY.md](docs/SSH_SECURITY.md)
(trust-on-first-connect host keys, Docker-group access being root-equivalent).

## Supported versions

Only the latest commit on `main` is supported until tagged releases exist.

## Operator guidance

Read [docs/SSH_SECURITY.md](docs/SSH_SECURITY.md). Use a dedicated, restricted
`monitor` user on your servers, keep `SSH_MASTER_ENCRYPTION_KEY` backed up
outside the database, and run the app behind HTTPS.
