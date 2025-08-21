FROM python:3.11-slim as builder

# Install uv securely
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Create and activate a virtual environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /app

# Copy dependency files and install them
# This leverages Docker's layer caching
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml