import time

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    return TestClient(main.app)


def test_health_and_meta(client):
    assert client.get("/health").json() == {"ok": True}
    meta = client.get("/api/meta").json()
    assert {s["id"] for s in meta["sites"]} >= {"linkedin", "indeed", "glassdoor"}


def test_skills_autocomplete(client):
    assert any(s["skill"] == "kubernetes" for s in client.get("/api/skills?q=kube").json())


def test_unknown_site_is_rejected_with_422(client):
    r = client.post("/api/scrape", json={"search_term": "data analyst", "sites": ["monster"]})
    assert r.status_code == 422


def test_full_job_lifecycle(client, calls):
    start = client.post("/api/scrape", json={"search_term": "Data Analyst", "countries": ["united states"],
                                            "sites": ["indeed"], "hours_old": None})
    assert start.status_code == 200
    job_id = start.json()["job_id"]
    status = {}
    for _ in range(50):
        status = client.get(f"/api/scrape/{job_id}").json()
        if status["status"] in ("done", "failed"):
            break
        time.sleep(0.2)
    assert status["status"] == "done" and status["total_jobs"] >= 1
    page = client.get(f"/api/results/{job_id}?page_size=2").json()
    assert page["total"] >= 1 and "Job Title" in page["items"][0]
    for fmt, ctype in (("csv", "text/csv"), ("json", "application/json"), ("xlsx", "spreadsheetml")):
        r = client.get(f"/api/download/{job_id}?format={fmt}")
        assert r.status_code == 200 and ctype in r.headers["content-type"]
    assert client.delete(f"/api/scrape/{job_id}").json() == {"deleted": True}
    assert client.get(f"/api/scrape/{job_id}").status_code == 404


def test_resume_upload_endpoint(client):
    text = ("Jane Doe\nData Analyst | London, United Kingdom\nSKILLS\nSQL, Python, Tableau, Excel\n"
            "EXPERIENCE\nData Analyst | Acme | Jan 2022 - Present\n").encode()
    r = client.post("/api/resume/analyze", files={"file": ("cv.txt", text, "text/plain")})
    assert r.status_code == 200 and r.json()["suggested_request"]["search_term"] == "Data Analyst"
    bad = client.post("/api/resume/analyze", files={"file": ("cv.xyz", b"hello" * 30, "application/zip")})
    assert bad.status_code == 422
