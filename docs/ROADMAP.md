# Roadmap

Plans, not promises. Order can change.

## Shipped
- Eight job platforms in one search, 70+ countries plus remote and worldwide
- Filters: posted window, work mode, job type, experience level and years, salary, keywords, company, title match
- Cross-industry skill matching with match % and skill gaps
- Resume upload that pre-fills the search
- De-duplication across platforms and relevance ranking
- Excel (with application tracker), CSV and JSON export
- Filter funnel that shows why a search returned nothing
- Self-hosting with Docker Compose

## Next: less waiting
- Queue position and estimated wait on the progress screen
- "Notify me" when a search finishes: in-app history and browser notification first, email later
- Server-Sent Events instead of polling

## Then: reliability and scale
- Persist jobs and results (Postgres or Redis) so they survive restarts and last longer than an hour
- Separate worker process with a real queue, so the API and scraping scale independently
- Fair scheduling so one user can't block everyone, plus short-lived caching of identical searches
- Per-user limits and optional accounts (the bundled frontend does not send an API key yet)

## Ideas
- Saved searches with alerts for new jobs
- More job boards and per-country sources
- Prebuilt multi-architecture images on Docker Hub (the publish workflow is ready; it needs registry secrets)
- Kubernetes or Helm deployment once there is shared state to scale

## Not planned
- Storing resumes or personal data on a server
- Automatic job applications
