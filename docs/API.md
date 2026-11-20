# API reference

Base URL: `http://localhost:8000`. Interactive docs (Swagger) are at `/docs` when the backend is running.

If the `API_KEYS` environment variable is set, send `X-API-Key: <key>` on every request. Jobs are then only visible to the key that created them.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness check, returns `{"ok": true}` |
| `GET` | `/api/meta` | Everything needed to build a search form: sites, countries, filter options, skill categories, limits |
| `GET` | `/api/countries` | Country list (kept for compatibility) |
| `GET` | `/api/skills?q=kube` | Skill autocomplete |
| `POST` | `/api/resume/analyze` | Upload a PDF, DOCX or TXT resume; returns a profile and a ready-made `suggested_request` |
| `POST` | `/api/scrape` | Start a search; returns `job_id` immediately |
| `GET` | `/api/scrape/{job_id}` | Status, progress, warnings and filter funnel |
| `GET` | `/api/results/{job_id}?page=1&page_size=50` | Ranked results, paged (only when status is `done`) |
| `GET` | `/api/download/{job_id}?format=xlsx\|csv\|json` | Download results |
| `POST` | `/api/scrape/{job_id}/cancel` | Stop a queued or running search |
| `DELETE` | `/api/scrape/{job_id}` | Delete a search and its files |

## Start a search

Only `search_term` is required. Everything else has a default or is optional.

```bash
curl -X POST http://localhost:8000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
        "search_term": "Data Analyst",
        "countries": ["india", "remote"],
        "sites": ["linkedin", "indeed"],
        "hours_old": 72,
        "experience_levels": ["entry"],
        "my_skills": ["sql", "python", "tableau"]
      }'
# {"job_id":"Q3x...","tasks_planned":6,"warnings":[]}
```

| Field | Meaning |
|---|---|
| `search_term`, `extra_search_terms` | Main query plus up to 4 extra queries |
| `countries`, `cities` | Country names, `remote`, `worldwide`, or `"City, Country"` |
| `sites` | Any of `linkedin`, `indeed`, `glassdoor`, `zip_recruiter`, `google`, `bayt`, `naukri`, `bdjobs` (default: all) |
| `hours_old` | Posted within N hours (`null` = any age) |
| `work_mode` | `any`, `remote`, `onsite` |
| `job_types` | `fulltime`, `parttime`, `internship`, `contract` |
| `experience_levels`, `max_experience_years` | Seniority from the job title; years required from the description |
| `min_salary_annual`, `salary_currency`, `require_salary` | Salary filter (unknown salaries are kept unless `require_salary`) |
| `must_include_any`, `must_include_all`, `exclude_keywords` | Keyword filters |
| `boost_keywords` | Rank higher, never remove |
| `title_match` | `off`, `any`, `all` words of the query in the title |
| `company_include`, `company_exclude` | Company name filters |
| `my_skills` | Your skills, for match % and skill gaps |
| `results_per_site`, `top_n` | Size limits |
| `fetch_full_description` | Better filtering, slower on LinkedIn |

## Status values

`queued` (waiting for a free worker), `running`, `done`, `failed`, `cancelled`.

A finished search returns `total_jobs`, `warnings` (per-site problems) and `funnel`, a list of `{stage, jobs}` showing how many jobs survived each step. If `total_jobs` is 0, the funnel shows which filter removed everything.

## Errors

| Code | Meaning |
|---|---|
| 400 | None of the selected sites support the selected locations |
| 401 | Missing or invalid API key (only when `API_KEYS` is set) |
| 404 | Unknown or expired job |
| 409 | Results requested before the job is `done` |
| 422 | Invalid request (the response says which field), or an unreadable resume |
