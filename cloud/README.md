# Deploying JobEscape

Pick the option that fits. All of them run the same two services (frontend and backend).

| Option | Cost | Good for | Catch |
|---|---|---|---|
| **Your own computer** ([guide](../docs/self-hosting.md)) | Free | Privacy, daily use | Only while the computer is on |
| **Render (backend) + Vercel (frontend)** | Free tiers | Demos and sharing a link | Free backend sleeps when idle and is small |
| **Any Ubuntu server with HTTPS** (`cloud/vps/`) | Cost of a server, or free on some providers' always-free plans | An always-on private instance | You manage the server |

> **Important: JobEscape has no login.** Anyone who can reach a deployed instance can run searches from its IP address and use its resources. For anything public, restrict access (the server setup has an `ALLOWED_IPS` setting, or put it behind a VPN such as Tailscale), and keep resume uploads in mind: they're processed in memory but travel over the network.

> **Scraping from cloud servers gets blocked.** LinkedIn, Indeed and Glassdoor rate-limit data-centre IP ranges. Expect failures on free hosting. Rotating proxies (`SCRAPER_PROXIES`) are the usual fix.

---

## Option A: Render (backend) + Vercel (frontend), free demo

Order matters, because each side needs the other's URL.

**1. Backend on Render**
1. In Render choose **New, Blueprint**, connect this repo, and apply. The root `render.yaml` creates a free Docker web service named `jobescape-api`.
2. When asked for `CORS_ORIGINS`, enter a placeholder for now (for example `https://example.com`).
3. Wait for the deploy, then note the URL (`https://jobescape-api.onrender.com` or similar). Check `https://<your-url>/health`.

**2. Frontend on Vercel**
1. In Vercel choose **Add New, Project**, import this repo, and set **Root Directory** to `frontend`.
2. Add the environment variable `NEXT_PUBLIC_API_URL` = your Render URL (no trailing slash).
3. Deploy and note the Vercel URL.

**3. Connect them**
In Render open the service's **Environment** tab and set `CORS_ORIGINS` to your Vercel URL, then let it redeploy.

Free-tier behaviour to expect:
- The backend sleeps when idle, so the first request after a pause is slow (tens of seconds).
- Free instances have small memory, so `render.yaml` keeps parallelism low.
- Searches and results live in memory: a restart or sleep ends running searches.

---

## Option B: Your own server with HTTPS

Works on any Ubuntu server (Oracle Cloud's always-free VMs, Hetzner, DigitalOcean and so on). It runs the app plus Caddy, which gets and renews HTTPS certificates automatically.

1. Create two DNS records pointing at the server: for example `jobs.example.com` and `api.jobs.example.com`.
2. Open ports **80** and **443** in your provider's firewall or security rules.
3. On the server:

```bash
git clone https://github.com/akarshmi/jobescape.git
cd jobescape
APP_DOMAIN=jobs.example.com API_DOMAIN=api.jobs.example.com ACME_EMAIL=you@example.com \
  bash cloud/vps/setup-ubuntu.sh
```

Or do it by hand:

```bash
cd cloud/vps
cp .env.example .env      # edit the domains
docker compose up -d --build
```

Restrict who can use it by setting `ALLOWED_IPS` in `cloud/vps/.env` (space-separated IPs or ranges), then run `docker compose up -d` again.

Update later: `git pull && docker compose -f cloud/vps/docker-compose.yml --project-directory cloud/vps up -d --build`.

---

## Option C: Prebuilt Docker images

`docker-compose.hub.yml` in the repo root runs prebuilt images with no build step. The images are published by `.github/workflows/docker-publish.yml` when you push a version tag (`git tag v0.1.0 && git push --tags`). It needs two repository secrets, `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`. The frontend image is built for `http://localhost:8000`, so it is for running on one computer with default ports.

---

## What isn't here yet

Kubernetes, managed databases and multi-instance setups need shared job storage first. See [the roadmap](../docs/ROADMAP.md).
