# AWS Amplify Deployment Guide: MinuteTalk AI

This guide walks you through deploying **MinuteTalk AI** (both the React frontend and FastAPI backend) to AWS Amplify. 

---

## 🏗️ Architecture Overview

The application is deployed using a hybrid serverless architecture:
- **Frontend**: A React SPA built with Vite and Tailwind CSS, hosted on AWS Amplify Hosting.
- **Backend**: A FastAPI Python application running inside AWS Lambda (using the Mangum ASGI adapter).
- **API Gateway**: An HTTP API Gateway (v2) exposing the Lambda backend with CORS enabled, allowing secure requests from the frontend.
- **CDK Integration**: The backend resources (Lambda and API Gateway) are defined declaratively in `amplify/backend.ts` using AWS CDK, which Amplify automatically provisions during deployment.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. An **AWS Account** with permissions for AWS Amplify, Lambda, API Gateway, CloudFormation, and IAM.
2. A **GitHub Account** to host your code repository.
3. A **Groq API Key** (obtainable for free at [Groq Console](https://console.groq.com)).

---

## 🚀 Step-by-Step Deployment

### Step 1: Fork the Repository
1. Go to your repository on GitHub.
2. Click the **Fork** button in the top right.
3. Select your personal GitHub account to create a copy of the repository.

### Step 2: Create a New Amplify App
1. Log in to the [AWS Management Console](https://console.aws.amazon.com) and navigate to **AWS Amplify**.
2. Click **Create new app** (or **Host app**).
3. Select **GitHub** as the Git provider and click **Next**.
4. Authorize AWS Amplify to access your GitHub repositories.
5. In the dropdown menus:
   - Select your forked repository (`MinuteTalkAi`).
   - Select the `main` branch.
6. Click **Next**.

### Step 3: Configure Build Settings
Amplify will automatically detect the `amplify.yml` file in the root of the project.
1. Review the detected configuration:
   - **Frontend**: `npm run build` targeting the `dist` directory.
   - **Backend**: Auto-packs the FastAPI lambda code into a `deployment.zip` and builds the CDK stack.
2. Click **Next**.

### Step 4: Configure Initial Environment Variables
During the build configuration step, expand **Advanced settings** (or do this in the next screen):
1. Add the following environment variable:
   - **Key**: `GROQ_API_KEY`
   - **Value**: *Your Groq API key* (e.g., `gsk_...`)
2. Click **Save and deploy**.

Amplify will now provision an environment and begin building both the frontend assets and backend infrastructure. The initial build will take **5-8 minutes**.

---

## 🔗 Connecting Frontend and Backend

Once the deployment completes, the backend API gateway is provisioned, but the frontend needs to be pointing to it.

### 1. Retrieve the Backend API URL
1. Navigate to the **AWS API Gateway** console.
2. Under **HTTP APIs**, look for the API named `MinuteTalk AI API` (or search for `MinuteTalk`).
3. Click on the API and copy the **Invoke URL** from the header or Stages tab (e.g., `https://a1b2c3d4.execute-api.us-east-1.amazonaws.com`).
   > [!IMPORTANT]
   > Make sure to copy the URL *without* any trailing slash (e.g. no `/` at the end).

### 2. Configure VITE_API_URL in Amplify
1. Return to the **AWS Amplify Console** and select your app.
2. In the left-hand menu, navigate to **Hosting** -> **Environment variables**.
3. Click **Manage variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: *The Invoke URL you copied in the previous step* (e.g., `https://a1b2c3d4.execute-api.us-east-1.amazonaws.com`)
4. Click **Save**.

### 3. Trigger a Redeploy
Since the frontend code was built before the API URL was configured, we must trigger a rebuild to inject the URL:
1. Navigate to **Deployments** or the branch dashboard in the Amplify console.
2. Click **Redeploy** (or push a commit to the GitHub repository).
3. Once this build finishes, your frontend will successfully communicate with your AWS Lambda backend!

---

## 🧪 Verification & Testing

### Test the Live Application
1. Open the frontend URL provided by AWS Amplify (e.g., `https://main.d123456.amplifyapp.com`).
2. Select a category (e.g., **Technology**).
3. Verify that:
   - The speaking prompt is generated.
   - The **Explain Topic** button displays speaking coach context.
   - The **Talking Points** and **60s Timer** work.

### Test Backend Directly
You can test the endpoints manually using `curl` or Postman:
```bash
# Test health check
curl https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/api/health

# Test topic generation
curl -X POST https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/api/topic \
  -H "Content-Type: application/json" \
  -d '{"category": "tech"}'
```

---

## 🛠️ Troubleshooting & Logs

### View Backend logs (FastAPI / Lambda)
If you receive `500 Server Error` or the AI fails to generate topics, inspect the Lambda logs:
1. Go to **AWS CloudWatch Console**.
2. Click **Log groups** in the left menu.
3. Select the log group named `/aws/lambda/MinuteTalkBackendStack-MinuteTalkBackend...`.
4. Open the latest log stream to view output, print statements, and exceptions.

### Common Errors

| Issue | Cause | Solution |
|---|---|---|
| **CORS errors in browser console** | Trailing slash in URL | Double check that `VITE_API_URL` in Amplify does **not** have a trailing `/` (e.g., `https://api.example.com` is correct; `https://api.example.com/` will trigger CORS preflight failures). |
| **Degraded status (falling back)** | Missing `GROQ_API_KEY` | Ensure `GROQ_API_KEY` environment variable is defined in the Amplify Console and that you triggered a redeploy after setting it. |
| **Model not found / 404** | Groq model mismatch | The backend automatically queries the list of active models in your Groq tier (falling back to `groq/compound-mini`). Verify your API key has active credits. |

---

## 🧼 Cleanup Instructions

To avoid any unexpected charges on your AWS account, delete the resources when you are finished:
1. Go to the **AWS Amplify Console**.
2. Select your app and click **Actions** -> **Delete app**.
3. Confirm deletion to tear down the hosting, Lambda function, API Gateway, and CloudFormation stacks.
