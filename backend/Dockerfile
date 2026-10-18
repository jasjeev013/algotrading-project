# Production image: no --reload, no bind-mounted source, runs as a
# non-root user. Local dev uses Dockerfile.dev instead (see root
# docker-compose.yml).
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN useradd --create-home --shell /bin/bash appuser

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Pre-create the volume mount point owned by appuser -- Docker copies this
# directory's permissions into a freshly-created named volume on first use,
# so QUANTDASH_DB_PATH stays writable without running as root.
RUN mkdir -p /app/data && chown appuser:appuser /app/data

USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
