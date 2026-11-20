import threading

import engine
from schemas import ScrapeRequest


def run(**kw):
    kw.setdefault("countries", ["united states"])
    req = ScrapeRequest(search_term="Data Analyst", **kw)
    return engine.run(req, lambda *_: None, threading.Event())


def test_date_window_and_dedupe(calls):
    r = run(sites=["indeed", "linkedin"], hours_old=72)
    titles = list(r.df["Job Title"])
    assert "Data Analyst" not in titles            # 30 days old: outside the 72h window
    assert len(titles) == len(set(titles))         # same job from two sites appears once


def test_entry_level_drops_senior_titles(calls):
    r = run(sites=["indeed"], hours_old=None, experience_levels=["entry"])
    titles = list(r.df["Job Title"])
    assert "Senior Data Analyst" not in titles and "Junior Data Analyst" in titles


def test_skill_match_and_gaps(calls):
    r = run(sites=["indeed"], my_skills=["sql", "python"], experience_levels=["entry"])
    top = r.df.iloc[0]
    assert top["Job Title"] == "Junior Data Analyst"
    assert "sql" in top["Matched Skills"] and "python" in top["Matched Skills"]
    assert "tableau" in top["Skill Gaps"]


def test_java_is_not_matched_inside_javascript():
    from skills import extract_skills
    assert "java" not in extract_skills("we use javascript and typescript")
    assert "java" in extract_skills("we use java, spring boot")


def test_sites_are_only_called_where_supported(calls):
    run(sites=["zip_recruiter", "naukri", "bayt"], countries=["india"], hours_old=None)
    assert sorted(c["site_name"][0] for c in calls) == ["bayt", "naukri"]   # ZipRecruiter is US/Canada only


def test_indeed_exclusive_filters_are_sent_one_at_a_time(calls):
    run(sites=["indeed"], hours_old=24, work_mode="remote", job_types=["fulltime"])
    kw = calls[0]
    assert kw.get("hours_old") == 24 and "is_remote" not in kw and "job_type" not in kw


def test_salary_filter_keeps_unknown_salary_by_default(calls):
    r = run(sites=["indeed"], hours_old=None, min_salary_annual=70000)
    assert "Junior Data Analyst" in list(r.df["Job Title"])          # known salary, passes
    assert "Senior Data Analyst" in list(r.df["Job Title"])          # unknown salary, kept


def test_over_strict_filters_give_empty_frame_and_funnel(calls):
    r = run(sites=["indeed"], must_include_any=["zzz-no-match"])
    assert r.df.empty and r.funnel[0][0] == "Scraped"


def test_task_cap_adds_warning(calls, monkeypatch):
    monkeypatch.setattr(engine.C, "MAX_TASKS_PER_JOB", 3)
    r = run(countries=["worldwide"], sites=["indeed"], hours_old=None)
    assert any("limited to 3" in w for w in r.warnings)
