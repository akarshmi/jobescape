.PHONY: up down logs build test dev-backend dev-frontend

up:	## build and start everything on http://localhost:3000
	docker compose up -d --build

down:	## stop and remove containers (results are wiped)
	docker compose down

logs:	## follow logs
	docker compose logs -f

build:	## build images without starting
	docker compose build

test:	## run backend tests
	cd backend && python -m pytest -q

dev-backend:	## backend with auto-reload on :8000
	cd backend && uvicorn main:app --reload --port 8000

dev-frontend:	## frontend dev server on :3000 (needs frontend/.env.local)
	cd frontend && npm run dev
