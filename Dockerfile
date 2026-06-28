# GCP Cloud Run container for the MythOS FastAPI backend (REST + WebSocket).
#
# LEAN by design: narrative=Gemini and image=Imagen are API calls, so this image
# omits the heavy local ML stack (torch/diffusers/mflux/...) and streamlit — see
# requirements-cloud.txt. Cloud Run runs the cloud config:
#   MYTHOS_NARRATIVE_PROVIDER=gemini  MYTHOS_VISUAL_PROVIDER=vertex  MYTHOS_STORAGE_BACKEND=gcs
# The React SPA is prebuilt into src/mythos_api/static (committed), so no Node build here.

FROM python:3.11-slim AS runtime

# - PYTHONUNBUFFERED: stream logs to Cloud Logging without buffering.
# - PIP_NO_CACHE_DIR: smaller image.
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MYTHOS_API_HOST=0.0.0.0

WORKDIR /app

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
