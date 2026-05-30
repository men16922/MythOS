# MythOS Local Runtime: Project Instructions

This document provides foundational context and mandates for the MythOS Local Runtime project, a narrative engine prototype leveraging local LLMs and image generation.

## Project Overview

MythOS is an agentic, loop-based narrative simulation engine. Players act as "Connectors" navigating a world that reshapes each loop, while "Echoes" of their past choices persist as narrative residue.

### Core Architecture

- **Narrative Engine (`src/mythos_narrative`)**: Uses Ollama (Gemma 4) to generate structured JSON scenes and choices.
- **Loop Engine (`src/mythos_loop`)**: Manages state transitions (`connect` -> `explore` -> `interact` -> `rewrite` -> `archive`) and narrative consistency.
- **Myth Protocol Validator**: A critical component that validates LLM-generated output against domain rules before state updates.
- **Visual Service (`src/mythos_image_agent`)**: Local image generation using FLUX.1-schnell via Diffusers and Apple Silicon MPS.
- **Memory Service (`src/mythos_memory`)**: Manages player history, world state, and "Echo" extraction using PostgreSQL.

### Technology Stack

- **Language**: Python 3.11+
- **LLM Provider**: Ollama (local)
- **Image Generation**: FLUX.1-schnell (MPS acceleration)
- **Database**: PostgreSQL 16 (Relational & JSONB state)
- **Object Storage**: MinIO (S3-compatible asset store)
- **Infrastructure**: Docker Compose for databases and observability.
- **Observability**: OpenTelemetry + Jaeger.
- **UI**: Streamlit (Browser Demo) and CLI.

## Building and Running

### Prerequisites
- Apple Silicon Mac (for MPS support).
- Ollama installed and running (default model: `gemma4:latest`).
- Hugging Face account with access to `black-forest-labs/FLUX.1-schnell`.

### Setup
1.  **Environment**: `cp .env.example .env` and configure `HF_TOKEN`.
2.  **Installation**: `make setup` (creates `.venv` and installs editable).
3.  **Infrastructure**: `make infra-up` to start Docker services.
4.  **Database**: `make db-migrate` to initialize the PostgreSQL schema.

### Key Commands
- **Streamlit Demo**: `make streamlit` (runs at `http://localhost:8501`).
- **CLI Demo**: `make connect-demo`.
- **System Check**: `make doctor` (verifies hardware and dependencies).
- **Full Smoke Test**: `make smoke` (runs tests and end-to-end flows).
- **Unit Tests**: `make test`.
- **DB Tests**: `make test-db`.

## Development Conventions

### Coding Style
- **Type Safety**: Strictly use Python type hints and `dataclasses` for domain models.
- **Naming**: `snake_case` for modules/functions, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants.
- **Patterns**: Prefer composition and provider interfaces (e.g., `Store`, `Director`, `VisualProvider`) to allow swapping backend implementations.
- **State Management**: Orchestrate logic in `RuntimeSessionService` (`src/mythos_runtime/session_service.py`) rather than duplicating in entry points.

### Testing Guidelines
- **Location**: All tests reside in `tests/` following the `test_*.py` pattern.
- **Environment**: Unit tests should be independent of Docker.
- **Integration**: Database tests are gated behind `MYTHOS_RUN_DB_TESTS=1`.
- **Validation**: Run `make smoke-local` for logic changes and `make smoke` for persistence/infra changes.

### Observability
- All major runtime operations (`connect`, `choose`, `generate`) are traced using OpenTelemetry.
- Logs are emitted as structured JSON via `mythos_runtime.observability`.

## Directory Map

- `src/mythos_core`: Pure domain models and seed logic.
- `src/mythos_memory`: PostgreSQL store implementations.
- `src/mythos_narrative`: LLM prompts, parsing, and JSON repair logic.
- `src/mythos_loop`: The core state machine and protocol validator.
- `src/mythos_runtime`: Orchestration layer, CLI, and Streamlit app.
- `src/mythos_image_agent`: Standalone FLUX worker.
- `docs/`: In-depth design docs, status updates, and gameplay rules.
- `migrations/`: SQL migration files for the database schema.
