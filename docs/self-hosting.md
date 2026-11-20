# Self-hosting JobEscape (private, on your own computer)

JobEscape searches LinkedIn, Indeed, Glassdoor, ZipRecruiter, Google Jobs, Bayt, Naukri and BDJobs **at once**, get one ranked, de-duplicated list, and export it to Excel. Upload your resume to pre-fill the search and see which skills each job asks for that you don't have yet.

This guide is for running it **on your own computer**, so your searches and resume never go through anyone else's server.

---

## Why run it locally

| | Stays on your computer | Leaves your computer |
|---|---|---|
| Your searches, filters, results | Yes | |
| Your resume (parsed in memory, never saved) | Yes | |
| Excel exports | Yes (RAM only, deleted when you stop the app) | |
| Requests to job sites (LinkedIn, Indeed, ...) | | Yes, from **your IP address**. That is how scraping works. |
| Font download | | Once, at build time only (Inter from Google Fonts) |

There are no accounts, no analytics and no tracking in the code. The frontend only talks to your own backend, and the backend only talks to the job sites. If you add proxies (see below), your searches pass through the proxy provider.

---

## Quick start (Docker, recommended)

You only need **Docker** with Compose v2 (Docker Desktop on Windows/macOS, or Docker Engine on Linux). Nothing else gets installed on your machine.

```bash
git clone https://github.com/akarshmi/jobescape.git
cd jobescape
docker compose up -d --build
```

Wait for the first build (a few minutes), then open **http://localhost:3000**.

| Command | What it does |
|---|---|
| `docker compose up -d --build` | Build and start (also use this after changing settings) |
| `docker compose logs -f` | Watch what's happening |
| `docker compose down` | Stop and remove the containers (all results are wiped) |
| `docker compose down --rmi local` | Same, and also delete the images it built |
| `git pull && docker compose up -d --build` | Update to the latest version |

**Prefer not to build?** Once prebuilt images are published (see `docs/ROADMAP.md` and `.github/workflows/docker-publish.yml`), you can skip the build:

```bash
docker compose -f docker-compose.hub.yml up -d
```

Prebuilt images always use `http://localhost:8000` for the API, so use the default ports.

Everything runs in two containers: the website on port **3000** and the API on port **8000**. There is no database and no volume, so nothing is written to your disk. By default both ports only listen on your own computer (`127.0.0.1`), so nobody else on your Wi-Fi can reach them.

---

## Using it

1. **Search:** type a job title, pick countries or cities, and press search. Open the optional sections for platforms, filters and keywords.
2. **Resume (optional):** upload a PDF, DOCX or TXT. It is read in memory to suggest a role, skills, experience level and location, then thrown away. Scanned or image-only PDFs aren't supported.
3. **Results:** open a job to see matched skills and skill gaps. Download as Excel, CSV or JSON.

Results are kept for 1 hour (and lost if you restart), so download what you want to keep.

---

## Settings (optional)

Defaults work. To change anything, copy the example file and edit it:

```bash
cp .env.example .env
docker compose up -d --build
```

| Setting | Default | What it does |
|---|---|---|
| `BIND_ADDRESS` | `127.0.0.1` | `127.0.0.1` = only this computer. `0.0.0.0` = your whole network (there is **no login**, so use only on a network you trust) |
| `FRONTEND_PORT` / `BACKEND_PORT` | `3000` / `8000` | Change if a port is already in use |
| `PUBLIC_HOST` | `localhost` | Set to your computer's IP only if you open the app from another device |
| `MAX_CONCURRENT_JOBS` | `2` | Searches running at once; extra ones wait |
| `MAX_PARALLEL_TASKS` | `12` | Simultaneous requests per search. Lower it on a weak computer or to be gentler on job sites |
| `MAX_TASKS_PER_JOB` | `150` | Cap on requests per search |
| `JOB_TTL_SECONDS` | `3600` | How long results are kept |
| `SCRAPER_PROXIES` | empty | Comma-separated proxies (`user:pass@host:port`) |

After changing ports or `PUBLIC_HOST`, always rebuild with `docker compose up -d --build`, because the backend address is built into the website.

---

## Run without Docker

You need **Python 3.12+** and **Node.js 20+**.

Backend:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --port 8000
```

Frontend (second terminal). It needs to know where the backend is, so create `frontend/.env.local` first:

```bash
cd frontend
cp .env.example .env.local          # contains NEXT_PUBLIC_API_URL=http://localhost:8000
npm ci
npm run dev                         # opens on http://localhost:3000
```

Run the backend as a single process (no `--workers`), because searches are tracked in memory.

---

## Troubleshooting

- **"Failed to fetch" in the app:** the website can't reach the API. If you changed ports or `PUBLIC_HOST`, rebuild with `docker compose up -d --build`. Check the API with `curl http://localhost:8000/health`.
- **Port already in use:** set `FRONTEND_PORT` / `BACKEND_PORT` in `.env`, then rebuild.
- **0 jobs or many failures:** LinkedIn, Indeed and Glassdoor rate-limit and block repeated requests from one IP. Try fewer platforms and countries, a smaller "results per site", a longer pause between searches, or proxies. The progress screen shows which sites had problems.
- **Build fails while downloading the font:** the build needs internet once to fetch the Inter font. Check your connection or proxy settings and run the build again.
- **Slow or out of memory:** lower `MAX_PARALLEL_TASKS` and `MAX_CONCURRENT_JOBS`, and search fewer countries at a time.
- **See the logs:** `docker compose logs -f backend`.

---

## Responsible use

Scraping job sites may be against their terms of service. Use JobEscape for your own job search, at low volume, and you are responsible for how you use it. Don't expose it to the internet: it has no login and anyone who can reach it can run searches from your IP address.

## Known limits

- One running instance only. Search state is in memory, so a restart ends running searches.
- No accounts or saved history. Your recent searches, light/dark choice and per-job application status and notes are kept in your own browser only (localStorage), so clearing site data erases them.
- Results depend on what the job sites return, and their formats change without notice.
