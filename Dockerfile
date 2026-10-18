# GCP Cloud Run container for the Mythos 2.0 web server (prebuilt SPA + /api/v2 saves and AI GM).
#
# The game runs in the browser; this image serves the SPA (src/mythos_api/static, committed — no Node build
# here), the game art (/resources) and /api/v2. The GM calls Vertex Gemini (MYTHOS_NARRATIVE_PROVIDER=vertex).

FROM python:3.11-slim AS runtime

# - PYTHONUNBUFFERED: stream logs to Cloud Logging without buffering.
# - PIP_NO_CACHE_DIR: smaller image.
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MYTHOS_API_HOST=0.0.0.0

WORKDIR /app

# Node runs the daily replay verifier (src/mythos_v2/replay_verify.mjs, a plain-JS bundle of the game engine built by
# `make frontend-build`; Node >= 18). Without it the API still works and daily results stay "unverified".
RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install the lean dependency set first (cache-friendly: changes rarely).
COPY requirements-cloud.txt ./
RUN pip install -r requirements-cloud.txt

# Copy the source needed to run the API (editable install keeps __file__-relative
# paths working: the /resources static mount resolves to /app/resources, and the SPA
# is package-data under src/mythos_api/static).
COPY pyproject.toml README.md ./
COPY src ./src
COPY resources ./resources

# Install the package itself WITHOUT re-resolving deps (the heavy pyproject core deps
# are deliberately not present; --no-deps keeps the image lean).
RUN pip install --no-deps -e .

# Cloud Run injects $PORT (default 8080). __main__ reads MYTHOS_API_PORT; map it.
ENV MYTHOS_API_PORT=8080
EXPOSE 8080

# Run through the module entrypoint so configure_logging() (structured JSON logs) runs.
CMD ["sh", "-c", "MYTHOS_API_PORT=${PORT:-8080} python -m mythos_api"]
