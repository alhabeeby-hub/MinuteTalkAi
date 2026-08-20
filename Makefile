# MinuteTalk AI - Makefile
# Quick commands for local development and testing

.PHONY: help
help:
	@echo "MinuteTalk AI - Available commands:"
	@echo ""
	@echo "  make setup      - Full setup (venv + install deps + create .env)"
	@echo "  make install    - Install frontend dependencies"
	@echo "  make backend    - Create venv and install backend dependencies"
	@echo "  make activate   - Show instructions to activate venv"
	@echo "  make dev         - Start frontend dev server"
	@echo "  make api         - Start backend API server (requires venv)"
	@echo "  make build       - Build frontend for production"
	@echo "  make test        - Run all tests"
	@echo "  make test-web    - Run frontend tests"
	@echo "  make test-api    - Run backend tests"
	@echo "  make lint        - Run linters"
	@echo "  make clean       - Clean build artifacts and venv"
	@echo ""

.PHONY: venv
venv:
	@echo "🐍 Creating Python virtual environment..."
	python -m venv venv
	@echo "✅ Virtual environment created at ./venv"

.PHONY: activate
activate:
	@echo "Activate the virtual environment with:"
	@echo "  source venv/bin/activate        (Linux/macOS)"
	@echo "  venv\\Scripts\\activate           (Windows)"

.PHONY: install
install:
	npm install

.PHONY: backend
backend: venv
	@echo "📦 Installing backend dependencies..."
	. venv/bin/activate 2>/dev/null || venv\\Scripts\\activate.bat 2>/dev/null || true
	pip install -r backend/requirements-dev.txt
	@echo "✅ Backend dependencies installed"

.PHONY: setup
setup: install backend
	cp .env.example .env.local 2>/dev/null || true
	cp backend/.env.example backend/.env 2>/dev/null || true
	@echo ""
	@echo "✨ Setup complete!"
	@echo "Activate venv: source venv/bin/activate"

.PHONY: dev
dev:
	npm run dev

.PHONY: api
api:
	cd backend && PYTHONPATH=.. . ../venv/bin/activate 2>/dev/null || venv\\Scripts\\activate 2>/dev/null || true && python -m uvicorn app.main:app --reload --port 8000

.PHONY: build
build:
	npm run build

.PHONY: test
test: test-web test-api

.PHONY: test-web
test-web:
	npm test -- --watchAll=false

.PHONY: test-api
test-api:
	. venv/bin/activate 2>/dev/null || venv\\Scripts\\activate.bat 2>/dev/null || true
	cd backend && PYTHONPATH=.. python -m pytest tests/ -v

.PHONY: test-api-cov
test-api-cov:
	. venv/bin/activate 2>/dev/null || venv\\Scripts\\activate.bat 2>/dev/null || true
	cd backend && PYTHONPATH=.. python -m pytest tests/ -v --cov

.PHONY: lint
lint:
	npm run lint 2>/dev/null || true
	cd backend && python -m flake8 .. --count --select=E9,F63,F7,F82 --show-source --statistics 2>/dev/null || true

.PHONY: lint-fix
lint-fix:
	npm run lint:fix 2>/dev/null || true

.PHONY: format
format:
	. venv/bin/activate 2>/dev/null || venv\\Scripts\\activate.bat 2>/dev/null || true
	cd backend && python -m black . 2>/dev/null || true
	cd backend && python -m isort . 2>/dev/null || true

.PHONY: clean
clean:
	rm -rf dist/
	rm -rf node_modules/
	rm -rf venv/
	rm -rf backend/package/
	rm -rf backend/deployment.zip
	rm -rf .pytest_cache
	rm -rf backend/.pytest_cache
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name *.egg-info -exec rm -rf {} + 2>/dev/null || true
