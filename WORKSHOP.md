# Workshop Guide: Deploying MinuteTalk AI

This guide walks you through deploying MinuteTalk AI using AWS Amplify for a 45-60 minute workshop session.

## Workshop Overview

| Phase | Time | Activity |
|-------|------|----------|
| 1. Kickoff | 5 min | Live demo + architecture |
| 2. Deploy | 10 min | Fork repo + Amplify deploy |
| 3. Walkthrough | 10 min | Code explanation |
| 4. Verification | 10 min | Test endpoints |
| 5. Hands-on | 10 min | Modify and redeploy |
| 6. Wrap-up | 5 min | Q&A + cleanup |

---

## Phase 1: Kickoff (5 min)

### What is MinuteTalk AI?

**MinuteTalk AI** is an impromptu speaking trainer that helps people practice quick thinking and speaking skills.

**User Flow:**
1. User selects a category (Tech, Science, Business, etc.)
2. App calls AI (Groq) to generate a random topic
3. User gets 60 seconds to speak on the topic
4. Hints are available if they get stuck

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        AWS Amplify                               │
│  ┌─────────────────────┐     ┌──────────────────────────────┐ │
│  │  Frontend (React)   │     │  Backend (FastAPI + Lambda)  │ │
│  │  - Vite             │     │  - Python 3.11               │ │
│  │  - Tailwind CSS    │     │  - Mangum adapter            │ │
│  │  - Hosting          │     │  - API Gateway               │ │
│  └─────────────────────┘     └──────────────────────────────┘ │
│            │                            │                       │
│            │                            │                       │
│            ▼                            ▼                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                    Groq API (Llama 3.1)                  │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 2: Deploy (10 min)

### Step 1: Fork the Repository

1. Go to the repository on GitHub
2. Click **Fork** in the top right
3. Select your GitHub account
4. Wait for the fork to complete

### Step 2: Create Amplify App

1. Go to **AWS Amplify Console**: https://console.aws.amazon.com/amplify/
2. Click **Create new app**
3. Select **GitHub** as the repository provider
4. Click **Connect branch** and select your fork
5. Select the `main` branch

### Step 3: Configure Build

Amplify auto-detects `amplify.yml`. Just verify:
- ✅ Frontend build command: `npm run build`
- ✅ Base directory: `dist`
- ✅ Click **Next**

### Step 4: Review and Deploy

1. Click **Save and deploy**
2. Wait for the build to complete (5-10 minutes)
3. Note the frontend URL (e.g., `main.d123456.amplifyapp.com`)

---

## Phase 3: Backend Setup (5 min)

### Add Groq API Key

1. Go to **Groq Console**: https://console.groq.com
2. Sign up / Log in
3. Click **API Keys** → **Create API Key**
4. Copy the key

### Add to Amplify

1. In Amplify console, go to **Environment variables**
2. Click **Manage variables**
3. Add:
   - Key: `GROQ_API_KEY`
   - Value: your Groq API key
4. Go to **Deployments** → Click **Redeploy**
5. Wait for rebuild

---

## Phase 4: Connect Frontend to Backend

### Get Backend URL

1. After backend deploys, go to **API Gateway** in AWS Console
2. Find the HTTP API (starts with `MinuteTalk`)
3. Copy the **Invoke URL** (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com`)

### Add to Frontend

1. In Amplify, add environment variable:
   - Key: `VITE_API_URL`
   - Value: your API Gateway URL (without trailing slash)
2. Redeploy frontend

---

## Phase 5: Verification (10 min)

### Test the Application

1. Open your frontend URL
2. Select a category (e.g., "Technology")
3. Verify:
   - ✅ Topic appears
   - ✅ Timer counts down
   - ✅ Hints can be shown

### Test API Directly

```bash
# Test health endpoint
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/api/health

# Test topic generation
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/api/topic \
  -H "Content-Type: application/json" \
  -d '{"category": "tech"}'
```

---

## Phase 6: Hands-on Modification (10 min)

### Try These Changes

1. **Add a New Category**
   - Edit `backend/app/main.py`
   - Add entry to `CATEGORY_PROMPTS`
   - Redeploy

2. **Change System Prompt**
   - Find `topic_prompt` in main.py
   - Make it more specific
   - Redeploy

3. **Modify Timer Duration**
   - Edit `src/App.jsx`
   - Change `TIMER_DURATION` constant
   - Commit and push

---

## Phase 7: Wrap-up (5 min)

### What We Built

- ✅ React + Vite frontend with Tailwind
- ✅ FastAPI backend with Groq integration
- ✅ AWS Lambda + API Gateway
- ✅ CI/CD with Amplify

### Cleanup Instructions

**Important:** To avoid charges:

1. Go to **AWS Amplify Console**
2. Select your app
3. Click **Delete app**
4. Confirm deletion

### Resources

- [Groq Documentation](https://console.groq.com/docs)
- [AWS Amplify Docs](https://docs.amplify.aws/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/)

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Check Node/npm versions match |
| API returns 500 | Check Lambda logs in CloudWatch |
| No topic generated | Verify GROQ_API_KEY is set |
| CORS errors | Check API Gateway CORS settings |

### View Logs

1. Go to **AWS CloudWatch**
2. Select **Log groups**
3. Find `/aws/lambda/minutetalk-backend-*`
4. Check recent log streams
