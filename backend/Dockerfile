FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (ffmpeg is heavily used for WebRTC audio decoding)
RUN apt-get update && apt-get install -y \
    build-essential \
    ffmpeg \
    git \
    libva-drm2 \
    libva2 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy all the project files
COPY . .

# Set PYTHONPATH so python knows where the modules are
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Health check — Docker will restart the container if /health stops responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Default command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
