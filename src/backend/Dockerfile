FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.1.1 \
    POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python3 -

ENV PATH="$POETRY_HOME/bin:$PATH"

WORKDIR /app

COPY pyproject.toml poetry.lock ./

RUN poetry install --no-root

COPY . .

EXPOSE 8000

CMD ["poetry", "run", "gunicorn", "-w", "1", "-b", "0.0.0.0:8000", "app:app"]
