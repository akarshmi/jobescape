"""Shared fixtures. No test touches the network: `engine.scrape_jobs` is replaced by a fake."""
import datetime as dt
import os
import tempfile

import pandas as pd
import pytest

os.environ.setdefault("OUTPUT_DIR", tempfile.mkdtemp(prefix="jobescape-test-"))


def fake_rows(site: str):
    today = dt.date.today()
    base = dict(site=site, job_type="fulltime", interval=None, currency=None, min_amount=None, max_amount=None)
    return [
        dict(base, title="Junior Data Analyst", company="Acme", job_url=f"https://x/{site}/1", location="Austin, TX",
             date_posted=today, is_remote=False, min_amount=60000, max_amount=80000, interval="yearly",
             currency="USD", description="We need SQL, Python, Tableau and Excel. 1 year of experience."),
        dict(base, title="Senior Data Analyst", company="Beta", job_url=f"https://x/{site}/2", location="Austin, TX",
             date_posted=today, is_remote=False, description="SQL, Python, AWS. 8+ years of experience."),
        dict(base, title="Data Analyst", company="Gamma", job_url=f"https://x/{site}/3", location="Remote",
             date_posted=today - dt.timedelta(days=30), is_remote=True, description="Java developer role."),
    ]


@pytest.fixture
def calls(monkeypatch):
    """Patch the scraper; returns the list of kwargs each fake call received."""
    import engine
    seen = []

    def fake_scrape_jobs(**kw):
        seen.append(kw)
        return pd.DataFrame(fake_rows(kw["site_name"][0]))

    monkeypatch.setattr(engine, "scrape_jobs", fake_scrape_jobs)
    return seen
