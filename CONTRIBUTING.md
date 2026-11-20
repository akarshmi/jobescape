# Contributing

Thanks for helping. This guide gets you from clone to pull request.

## Set up

You need Python 3.12+, Node.js 20+ (22 recommended), and optionally Docker.

```bash
git clone https://github.com/akarshmi/jobescape.git
cd jobescape

# backend
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
python -m pytest -q                                   # should pass without network access
uvicorn main:app --reload --port 8000

# frontend (second terminal)
cd frontend
cp .env.example .env.local                            # sets NEXT_PUBLIC_API_URL; the app breaks without it
npm ci
npm run dev
```

Or run everything with `docker compose up -d --build`. The `Makefile` has shortcuts (`make test`, `make up`).

## Tests

Backend tests live in `backend/tests/` and never touch the network: the scraper is replaced by a fake in `conftest.py`. Please add a test with any behaviour change. CI runs the tests, builds the frontend, and builds the Docker images.

The frontend lint (`npm run lint`) reports some existing errors and doesn't block CI yet. Please don't add new ones.

## Common changes

**Add a skill to the taxonomy:** add `"canonical|alias|alias"` to a category in `backend/skills.py`. Matching is word-boundary based, so `java` will not match `javascript`.

**Add a country:** add it to `COUNTRY_MAP` in `backend/config.py`. If a site supports only some countries, update that site's `countries` in `SITE_RULES`.

**Add a job site:** `python-jobspy` must support it. Add it to `ALL_SITES`, `SITE_RULES` and `SITE_LABELS` in `backend/config.py`, then handle any special parameters in `build_kwargs` in `backend/engine.py`.

**Add a filter:** add a request field in `backend/schemas.py`, write a `_stage_*` function in `backend/engine.py` that returns the filtered frame (or `None` when inactive), add it to `STAGES`, and test it. The stage name appears in the results funnel.

**Add an endpoint:** put it in `backend/main.py`, document it in `docs/API.md`.

## Pull requests

1. Branch from `main`, keep the change focused.
2. Run the tests and, for frontend changes, `npm run build`.
3. Fill in the PR template. Explain *why*, not just *what*.
4. Don't commit secrets, `.env` files, or real resumes and job data.

## Reporting problems

Bugs and ideas: open an issue using a template. Security problems: see [SECURITY.md](SECURITY.md), not a public issue.

By contributing you agree your work is released under the [MIT License](LICENSE).
