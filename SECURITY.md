# Security

## Supported status

This is a research prototype, not a production service.

## Important boundaries

- The mailbox binds to `127.0.0.1` by default and has no authentication.
- Do not expose the mailbox to the public internet without authentication, authorization, rate limiting, transport security, and a production queue.
- Model output and external observations are untrusted data.
- Never commit `.env`, API keys, private journals, or confidential images.
- Do not use third-party artwork or private photographs without appropriate rights and consent.
- Generated artifacts are not published automatically.
- The project does not execute code supplied by the model.

## Reporting

Open a private security advisory in the GitHub repository rather than posting credentials or exploit details in a public issue.
