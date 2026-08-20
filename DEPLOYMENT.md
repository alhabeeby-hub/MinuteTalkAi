# AWS Amplify Automated Deployment Guide: MinuteTalk AI

This guide walks you through deploying **MinuteTalk AI** (both the React frontend and FastAPI backend) **entirely from the AWS Console**, without needing to run any commands locally. This flow is optimized for live hands-on workshops to prevent environment-related issues.

---

## 🏗️ Architecture Overview

The application is deployed using a serverless architecture:
- **Frontend**: A React SPA built with Vite and Tailwind CSS, hosted on AWS Amplify Hosting.
- **Backend**: A FastAPI Python application running inside AWS Lambda (using the Mangum ASGI adapter).
- **API Gateway**: An HTTP API Gateway (v2) exposing the Lambda backend with CORS enabled, allowing secure requests from the frontend.
- **CDK Integration**: The backend resources (Lambda and API Gateway) are defined in `amplify/backend.ts` using AWS CDK, and are deployed automatically by AWS Amplify's build pipeline.

---

## 📋 Prerequisites

Before starting, ensure you have:
1. An **AWS Account** with administrative access (standard for workshop participants).
2. A **GitHub Account**.
3. A **Groq API Key** (obtainable for free at [Groq Console](https://console.groq.com)).

---

## 🚀 Step-by-Step Deployment (Console Only)

### Step 1: Fork the Repository
1. Go to your repository on GitHub.
2. Click the **Fork** button in the top right.
3. Select your personal GitHub account to create a copy of the repository.

### Step 2: Create the Amplify Service Role
AWS Amplify needs permission to provision resources (CloudFormation, Lambda, API Gateway, IAM Roles) in your AWS Account.
1. Open the **AWS IAM Console** (Identity and Access Management).
2. In the sidebar, click **Roles** -> **Create role**.
3. Select **AWS service** -> choose **Amplify** from the list of use cases.
4. Select **Amplify - Backend Deployment** and click **Next**.
5. On the permissions screen, search for and check **AdministratorAccess** (this guarantees the build pipeline can create IAM roles and provision Lambda/API Gateway resources). Click **Next**.
6. Name the role `AmplifyBackendDeploymentRole` and click **Create role**.

---

### Step 3: Deploy the App on AWS Amplify
1. Open the **AWS Amplify Console**.
2. Make sure you are in your desired AWS Region (e.g. **Oregon / `us-west-2`** or **N. Virginia / `us-east-1`**).
3. Click **Create new app** (or **Host app**).
4. Select **GitHub** as the Git provider and click **Next**.
5. Connect your fork:
   - Select your repository (`MinuteTalkAi`).
   - Select the `main` branch.
   - Click **Next**.
6. **Configure Build Settings**:
   - Amplify will auto-detect your `amplify.yml` file.
   - **Leave "My app is a monorepo" unchecked** (disabled) since the React app configuration sits directly at the root.
   - Under **App service role**, select the `AmplifyBackendDeploymentRole` you created in Step 2.
7. **Configure Environment Variables**:
   - Expand the **Advanced settings** section.
   - Add the following environment variable (required by the backend during build/deployment):
     - **Key**: `GROQ_API_KEY`
     - **Value**: *Your Groq API key* (e.g., `gsk_...`)
8. Click **Save and deploy**.

Amplify will now provision the environment, build your frontend, package your Lambda backend, and run `cdk deploy` in the cloud automatically. The build will take **5-8 minutes**.

---

## 🔗 Connecting Frontend and Backend

Once the deployment completes, the backend API Gateway is created, but we must tell the frontend where to find it.

### 1. Retrieve the Backend API URL
1. Open the **AWS API Gateway** console (in the same region as your Amplify app).
2. Under **HTTP APIs**, click on the API named `MinuteTalk AI API` (or search for `MinuteTalk`).
3. Copy the **Invoke URL** from the header or Stages tab (e.g., `https://a1b2c3d4.execute-api.us-west-2.amazonaws.com`).
   > [!IMPORTANT]
   > Copy the URL **without** a trailing slash `/` at the end.

### 2. Configure VITE_API_URL in Amplify
1. Go back to the **AWS Amplify Console** and open your app.
2. In the sidebar, navigate to **Environment variables** (under App settings).
3. Click **Manage variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: *The Invoke URL you copied in the previous step* (e.g., `https://a1b2c3d4.execute-api.us-west-2.amazonaws.com`)
4. Click **Save**.

### 3. Trigger a Redeploy
We must rebuild the frontend to inject the new API URL:
1. In the Amplify console, click the branch name (`main`).
2. Click **Redeploy** (or commit/push a change to your GitHub repository).
3. Once the build finishes, your live frontend will communicate with your live Lambda backend!

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
You can test the endpoints manually using `curl`:
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
1. Go to the **AWS CloudWatch Console** in the **same region** your app was deployed in.
2. Click **Log groups** in the left menu.
3. Select the log group named `/aws/lambda/MinuteTalkBackendStack-MinuteTalkBackend...`.
4. Open the latest log stream to view output, print statements, and exceptions.

### Common Errors

| Issue | Cause | Solution |
|---|---|---|
| **CORS errors in browser console** | Trailing slash in URL | Double check that `VITE_API_URL` in Amplify does **not** have a trailing `/` (e.g., `https://api.example.com` is correct; `https://api.example.com/` will trigger CORS preflight failures). |
| **Degraded status (falling back)** | Missing `GROQ_API_KEY` | Ensure `GROQ_API_KEY` environment variable is defined in the Amplify Console during the build. Check the CloudWatch logs to verify it is loaded correctly. |
| **Model not found / 404** | Groq model mismatch | The backend automatically queries the list of active models in your Groq tier (falling back to `groq/compound-mini`). Verify your API key has active credits. |

---

## 🧼 Cleanup Instructions

To avoid any unexpected charges on your AWS account, delete the resources when you are finished:
1. **CDK Backend**: Open the **AWS CloudFormation** console, select the stack `MinuteTalkBackendStack`, and click **Delete**.
2. **Amplify Hosting**: Go to the **AWS Amplify Console**, select your app, click **Actions** -> **Delete app**.
