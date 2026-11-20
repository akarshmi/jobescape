import pytest

import resume

PRO = """PRIYA SHARMA
Senior Backend Developer | Bangalore, India | priya@example.com | linkedin.com/in/priyasharma | github.com/priya-s
SUMMARY
Backend developer with 6+ years of experience building Java and Spring Boot microservices on AWS.
EXPERIENCE
Senior Software Engineer | Acme Corp | Jan 2021 - Present
- Built REST APIs with Spring Boot, PostgreSQL and Kafka; deployed with Docker and Kubernetes.
Software Engineer | Beta Ltd | Jun 2018 - Dec 2020
EDUCATION
B.Tech in Computer Science, Delhi Technological University, 2014 - 2018
SKILLS
Languages: Java, Python, SQL
"""

STUDENT = """Rahul Verma
Pune, Maharashtra, India | rahul@mail.com
EDUCATION
Master of Computer Applications (MCA), Some University, 2025 - Present
PROJECTS
Job tracker - React, Node.js and MongoDB (Jan 2025 - Mar 2025)
SKILLS
Java, Spring Boot, MySQL, React, Git
"""


def test_professional_profile():
    r = resume.analyze_resume(PRO)
    assert r["suggested_search"] == "Backend Developer"
    assert r["seniority"] == "senior"
    assert r["years_experience"] >= 6
    assert r["email"] == "priya@example.com"
    assert "Bangalore, India" in r["locations"]["cities"]
    assert {"java", "spring boot", "kafka"} <= set(r["skills"])
    assert r["education"]["degree"] == "Bachelor's"


def test_student_gets_entry_levels_and_projects_do_not_count_as_experience():
    r = resume.analyze_resume(STUDENT)
    assert r["is_student"] is True
    assert r["experience_levels"] == ["intern", "entry"]
    assert r["years_experience"] is None


def test_suggested_request_is_valid_for_the_api():
    from schemas import ScrapeRequest
    for text in (PRO, STUDENT):
        ScrapeRequest(**resume.analyze_resume(text)["suggested_request"])


def test_empty_and_gibberish_do_not_crash():
    assert resume.analyze_resume("")["suggested_request"] == {}
    assert resume.analyze_resume("lorem ipsum " * 100)["suggested_search"] is None


@pytest.mark.parametrize("name,ctype,data", [
    ("cv.doc", "", b"x" * 100),
    ("cv.png", "image/png", b"x" * 100),
    ("cv.pdf", "application/pdf", b"not really a pdf"),
])
def test_bad_files_raise_clear_errors(name, ctype, data):
    with pytest.raises(ValueError):
        resume.extract_text(name, ctype, data)
