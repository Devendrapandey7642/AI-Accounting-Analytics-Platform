FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
RUN npm run build


FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend /app/backend
COPY models /app/models
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist
RUN mkdir -p /app/data/uploads /app/data/processed /app/reports/pdf_reports /app/reports/ppt_reports

EXPOSE 8000

CMD ["sh", "-c", "python -m uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
