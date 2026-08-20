# MinuteTalk AI

<p align="center">
  <img src="https://img.shields.io/badge/React-18.2-blue" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-0.109-green" alt="FastAPI">
  <img src="https://img.shields.io/badge/AWS-Lambda-orange" alt="AWS Lambda">
  <img src="https://img.shields.io/badge/Groq-Llama3-purple" alt="Groq">
</p>

An impromptu speaking trainer where users pick an interest area, receive a concise AI-generated topic with a 60-second speaking countdown timer, can request a speaking coach explanation, and can reveal quick talking points if they get stuck.

## 🚀 Quick Start

### Prerequisites

- **GitHub Account** - For forking the repository
- **AWS Account** - For Amplify deployment
- **Groq API Key** - Free at https://console.groq.com

### 5-Minute Deployment

1. **Fork this repository** to your GitHub account

2. **Log in to AWS Amplify**
   - Go to https://console.aws.amazon.com/amplify/
   - Click "Create new app"
   - Select "GitHub" as the repository provider
   - Authorize Amplify to access your repositories

3. **Select your fork**
   - Choose the forked repository
   - Select the `main` branch

4. **Configure build settings**
   - Amplify auto-detects `amplify.yml` - just click Next
   - Click **Save and deploy**

5. **Add Environment Variable**
   - In the Amplify console, go to **Environment variables**
   - Add: `GROQ_API_KEY` = your Groq API key
   - Redeploy

6. **Add API URL to Frontend**
   - After backend deploys, copy the API endpoint URL
   - Add it as `VITE_API_URL` in frontend environment variables

**Done!** 🎉 Your app is live!

## 📁 Project Structure

```
minutetalk-ai/
├── amplify/               # AWS CDK infrastructure
│   ├── backend.ts         # Lambda + API Gateway definitions
│   ├── package.json       # CDK dependencies
│   ├── tsconfig.json
│   └── team-provider-info.json
├── backend/               # FastAPI Python backend
│   ├── app/
│   │   ├── main.py       # API endpoints + Groq integration
│   │   └── __init__.py
│   ├── tests/
│   │   ├── __init__.py
│   │   └── test_api.py   # Backend tests
│   ├── requirements.txt  # Production dependencies
│   ├── requirements-dev.txt # Development dependencies
│   ├── pytest.ini
│   └── .env.example      # Backend env template
├── src/                   # React frontend
│   ├── App.jsx           # Main application component
│   ├── App.test.jsx      # Frontend tests
│   ├── main.jsx         # React entry point
│   ├── index.css        # Tailwind CSS + custom styles
│   ├── vite-env.d.ts
│   ├── setupTests.jsx    # Test setup
│   └── __mocks__/
│       └── fileMock.js
├── public/
│   └── vite.svg          # App icon
├── .env.example          # Frontend env template
├── .env                  # Frontend environment (for local dev)
├── .gitignore
├── amplify.yml           # Cloud build specification
├── babel.config.cjs     # Babel config for tests
├── jest.config.cjs       # Jest configuration
├── LICENSE               # MIT license
├── Makefile              # Quick dev commands
├── package.json          # Frontend dependencies
├── README.md             # Full documentation
├── DEPLOYMENT.md         # AWS Amplify Deployment Guide
├── WORKSHOP.md          # Workshop deployment guide
└── vite.config.js
```

## 🏗️ Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Frontend │ ───► │  API Gateway     │ ───► │  AWS Lambda     │
│  (Amplify       │      │  (HTTP API v2)   │      │  (FastAPI +     │
│   Hosting)      │      │                  │      │   Mangum)       │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                          │
                                                          ▼
                                                  ┌─────────────────┐
                                                  │  Groq API       │
                                                  │  (Llama 3.1)    │
                                                  └─────────────────┘
```

## 🔧 Development

### Quick Setup (All-in-One)

```bash
# Install frontend and backend dependencies + create .env files
make setup

# Start both servers
make dev    # Terminal 1: Frontend dev server
make api    # Terminal 2: Backend API server
```

### Local Development

**Setup:**
```bash
# Copy environment files
cp .env.example .env.local
cp backend/.env.example backend/.env

# Edit the .env files with your Groq API key
```

**Frontend:**
```bash
# Install dependencies
npm install

# Start Vite dev server
npm run dev
# Open http://localhost:5173
```

**Backend:**
```bash
# Create virtual environment
make backend

# Activate the virtual environment (one-time)
make activate

# Run FastAPI server
make api
```

### Running Tests

**Frontend Tests:**
```bash
npm test                    # Run tests in watch mode
npm test -- --watchAll=false   # Run tests once
npm run test:coverage       # Run with coverage
```

**Backend Tests:**
```bash
# Make sure venv is activated
make test-api       # Run all tests
make test-api-cov   # Run tests with coverage
```

**All Tests:**
```bash
make test
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend API URL |
| `GROQ_API_KEY` | *(empty)* | Groq API key (optional - falls back to default topics) |

When `GROQ_API_KEY` is not set, the backend uses pre-defined fallback topics, so you can still test the full application locally!

## 📝 API Endpoints

### `POST /api/topic`

Generate a random speaking topic.

**Request:**
```json
{
  "category": "tech"
}
```

**Response:**
```json
{
  "topic": "The future of artificial intelligence in everyday life",
  "hints": [
    "Start with a personal example",
    "Discuss both benefits and concerns",
    "End with a prediction"
  ],
  "category": "tech"
}
```

### `GET /api/health`

Health check endpoint.

### `POST /api/explain`

Generate an explanation and key talking angles for a given topic.

**Request:**
```json
{
  "topic": "Should AI-generated code become a legally protected form of intellectual property?",
  "category": "tech"
}
```

**Response:**
```json
{
  "explanation": "This topic discusses the legal and ethical ownership of AI-created assets. Key angles to consider:\n1. Who should own the rights (the developer, the AI company, or the public domain)?\n2. The precedent set by current copyright laws regarding human authors.\n3. The impact on small creators vs. massive tech platforms."
}
```

## 🎯 Categories

| ID | Name | Description |
|----|------|-------------|
| `tech` | Technology | Software, AI, innovation |
| `science` | Science | Discoveries, research |
| `business` | Business | Entrepreneurship, careers |
| `sports` | Sports | Athletics, competition |
| `entertainment` | Entertainment | Film, music, pop culture |
| `lifestyle` | Lifestyle | Wellness, personal growth |
| `history` | History | Historical events, figures |
| `society` | Society | Social issues, culture |

## 🔐 Environment Variables

### Frontend

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_URL` | Backend API URL | Yes (after deployment) |

### Backend (Lambda)

| Variable | Description | Required |
|----------|-------------|----------|
| `GROQ_API_KEY` | Groq API key | No (falls back to default topics) |

## 🧪 Testing

The project includes comprehensive tests for both frontend and backend.

### Frontend Test Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run tests in watch mode |
| `npm test -- --watchAll=false` | Run tests once |
| `npm run test:coverage` | Run tests with coverage report |

### Backend Test Commands

| Command | Description |
|---------|-------------|
| `make test-api` | Run all backend tests |
| `make test-api-cov` | Run tests with coverage |

**Windows (without Make):**
```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Run tests
cd backend
$env:PYTHONPATH=".."
python -m pytest tests/ -v
```

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make setup` | Install all dependencies |
| `make dev` | Start frontend dev server |
| `make api` | Start backend API server |
| `make test` | Run all tests |
| `make build` | Build for production |
| `make clean` | Clean build artifacts |

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS 3.4
- **Backend**: FastAPI 0.109, Python 3.11
- **Cloud**: AWS Lambda, API Gateway, Amplify Hosting
- **AI**: Groq (Llama 3.1 8B)

## 📄 License

MIT License - feel free to use for your workshop!

## 🙏 Credits

- Created and Built by [Abdulbasit Olanrewaju](https://www.linkedin.com/in/abdulbasit-olanrewaju-gbolahan) for the AWS Workshop "Building AI-Powered Apps with Amplify"