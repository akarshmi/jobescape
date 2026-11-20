# JobEscape backend (FastAPI). Rename of the old `DockerFile` (Linux file systems are case-sensitive).
# Python 3.12 is what this was tested with; change with: docker compose build --build-arg PYTHON_VERSION=3.13
ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    # Excel files are written here. /tmp is writable by the non-root user (and is a tmpfs in compose).
    OUTPUT_DIR=/tmp/scraped

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Run as a normal user, not root.
RUN useradd --create-home --uid 10001 app && chown -R app:app /app
USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=4).status == 200 else 1)"

# One process only: jobs live in memory, so do NOT add --workers.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]