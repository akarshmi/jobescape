# Security

## Reporting a vulnerability

Please **don't open a public issue** for a security problem. Use GitHub's private reporting instead: open the repository's **Security** tab and choose **Report a vulnerability**. Describe what you found, how to reproduce it, and what it could affect. You'll get a reply as soon as the maintainer can; this is a small project, so please be patient.

## Supported versions

Only the latest commit on `main` and the most recent release receive fixes.

## Threat model

JobEscape is built to run **privately on your own computer or a server you control**.

- **No accounts or login.** Anyone who can reach an instance can run searches from that machine's IP address and use its resources. Don't expose an instance to the public internet without protection (a VPN such as Tailscale, a firewall allow-list, or the `ALLOWED_IPS` setting in `cloud/vps`).
- **Optional API key.** Setting `API_KEYS` on the backend requires an `X-API-Key` header and makes each search private to its key. The bundled frontend does not send a key yet, so enabling it is for API use only.
- **Resumes** are parsed in memory and never written to disk or logged. Search results are kept in memory and as temporary Excel files, deleted after `JOB_TTL_SECONDS` (default one hour).
- **Outbound traffic** goes to the job sites (and to your proxy provider if you configure `SCRAPER_PROXIES`). The app has no analytics or telemetry.
- **Container hardening.** The Docker images run as a non-root user, drop Linux capabilities, and the default compose file only listens on `127.0.0.1`.

## Out of scope

- Job sites blocking or rate-limiting your IP address
- Findings that require access to the machine running the app
- Missing login on a deployment you chose to make public
