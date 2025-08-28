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
RUN uv pip install -r pyproject.toml

# Runtime stage
FROM python:3.11-slim

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Make sure we use venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Command to start the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]