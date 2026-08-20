# AWS Console Deployment Guide (Workshop Edition)

This guide walks you through deploying **MinuteTalk AI** (both the React frontend and FastAPI backend) entirely from within the AWS Console. We use **AWS Amplify** for the frontend and **AWS CloudShell** for the backend to guarantee a smooth, drift-free deployment without needing to configure your local terminal.

---

## 🏗️ Architecture Overview

The application uses a serverless architecture:
- **Frontend**: A React SPA built with Vite, hosted on AWS Amplify.
- **Backend**: A FastAPI Python application running in AWS Lambda.
- **API Gateway**: An HTTP API Gateway exposing the Lambda backend with CORS enabled.
- **CDK Integration**: The backend resources are defined in `amplify/backend.ts` using AWS CDK, and will be deployed seamlessly via AWS CloudShell.

---

## 📋 Prerequisites
1. An **AWS Account** with administrative access.
2. A **GitHub Account**.
3. A **Groq API Key** (obtainable for free at [Groq Console](https://console.groq.com)).

---

## 🚀 Step 1: Deploy Frontend via AWS Amplify
First, we will deploy the React frontend (which will initially have a broken backend link until Step 2 is complete).

1. **Fork the Repository**: Go to GitHub and click **Fork** to create a personal copy of this repository.
2. **Open AWS Amplify**: Log in to the [AWS Management Console](https://console.aws.amazon.com) and navigate to **AWS Amplify**.
3. **Check Region**: Ensure you are in your desired AWS Region (e.g., **Oregon / `us-west-2`** or **N. Virginia / `us-east-1`**).
4. **Create App**: 
   - Click **Create new app** (or **Host app**).
   - Select **GitHub** and connect your repository/fork on the `main` branch.
   - Click **Next**.
5. **Configure Build Settings**:
   - **Leave "My app is a monorepo" unchecked** (disabled).
   - Under **Advanced settings**, add an environment variable for the build:
     - **Key**: `GROQ_API_KEY`
     - **Value**: *Your Groq API key*
   - Click **Next** -> **Save and deploy**.

Amplify will now build and host your frontend website. (Wait for this to finish or proceed to Step 2 while it builds).

---

## ☁️ Step 2: Deploy Backend via AWS CloudShell
AWS CloudShell is a browser-based terminal that has Python, Node.js, and your AWS credentials pre-installed.

1. **Open CloudShell**: In the AWS Console top navigation bar, click the **CloudShell icon** (the small `>_` terminal icon next to the search bar). Wait a few seconds for the environment to boot.
2. **Clone your Repository**:
   Paste the following command into CloudShell (replace `YOUR_GITHUB_USERNAME`):
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/MinuteTalkAi.git
   cd MinuteTalkAi
   ```
3. **Package the Python Backend**:
   Run the following commands to zip the FastAPI application:
   ```bash
   cd backend
   pip install -r requirements.txt -t ./package
   cp -r app ./package/
   cd package
   zip -r ../deployment.zip .
   cd ../..
   ```
4. **Deploy the CDK Stack**:
   Run the following commands to build and deploy the AWS resources to your account:
   ```bash
   cd amplify
   npm ci
   npm run build
   npx cdk bootstrap
   npx cdk deploy --require-approval never
   ```
   *Note: If prompted, type `y` to confirm deployment.*

5. **Copy the Invoke URL**:
   Once the CDK deployment finishes, it will print the **ApiEndpoint** URL (e.g., `https://a1b2c3d4.execute-api.us-west-2.amazonaws.com`).
   > [!IMPORTANT]
   > Copy this URL exactly. Make sure there is **no trailing slash (`/`)** at the end.

---

## 🔗 Step 3: Connect Frontend and Backend
Now that the backend is live, we need to inject the URL into the frontend.

1. Return to the **AWS Amplify Console** and click on your app.
2. In the sidebar, navigate to **Environment variables** (under App settings).
3. Click **Manage variables** and add:
   - **Key**: `VITE_API_URL`
   - **Value**: *The Invoke URL you copied in CloudShell*
4. Click **Save**.
5. **Redeploy**: We must trigger a rebuild to bake the URL into the frontend.
   - Click the branch name (`main`) in the console.
   - Click the **Redeploy** button in the top right.
6. Once the rebuild completes, open the frontend URL. Your application is now fully connected!

---

## 🧪 Verification & Testing
1. Select a category (e.g., **Technology**) on your live site.
2. Verify that a topic generates successfully.
3. Click **Explain Topic** to verify the AI coaching fallback works.

---

## 🧼 Cleanup Instructions
To avoid unexpected charges after the workshop:
1. **CDK Backend**: Open the **AWS CloudFormation** console, select the stack `MinuteTalkBackendStack`, and click **Delete**.
2. **Amplify Hosting**: Go to the **AWS Amplify Console**, select your app, click **Actions** -> **Delete app**.
