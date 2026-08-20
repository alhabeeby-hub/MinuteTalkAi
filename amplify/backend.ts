/**
 * MinuteTalk AI - AWS CDK Infrastructure
 *
 * This file defines the cloud infrastructure for the MinuteTalk AI application
 * using AWS CDK (Cloud Development Kit). It provisions:
 *
 * 1. AWS Lambda Function - Runs the FastAPI backend
 * 2. Amazon API Gateway HTTP API - Provides the REST API endpoint
 * 3. IAM Role - Grants necessary permissions
 *
 * The Lambda code is packaged from ``backend/deployment.zip``, which is built
 * by running ``python backend/build_package.py``. That script installs
 * dependencies for Lambda's Linux x86_64 / Python 3.11 runtime, avoiding the
 * "No module named 'pydantic_core._pydantic_core'" import error.
 *
 * Deployment:
 *   1. cd backend && python build_package.py
 *   2. cd amplify && npm run build && npx cdk deploy
 */

import {
  Stack,
  StackProps,
  Duration,
  aws_lambda as lambda,
  aws_apigatewayv2 as apigatewayv2,
  aws_apigatewayv2_integrations as integrations,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * MinuteTalk Backend Stack
 *
 * Creates:
 * - Lambda function running the FastAPI + Mangum backend
 * - HTTP API Gateway (v2) with CORS support
 */
export class MinuteTalkBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ==================== LAMBDA FUNCTION ====================

    // The deployment.zip is produced by backend/build_package.py and already
    // contains the Linux-targeted dependencies + the app/ source at its root,
    // so the Lambda handler is `app.main.handler`.
    const backendFunction = new lambda.Function(this, 'MinuteTalkBackend', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'app.main.handler', // Mangum handler defined in app/main.py
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'backend', 'deployment.zip'),
      ),
      timeout: Duration.seconds(30),
      memorySize: 512,
      description: 'MinuteTalk AI FastAPI Backend Function',
      environment: {
        PYTHONUNBUFFERED: '1',
        // Injected at deploy time: `export GROQ_API_KEY=...` before cdk deploy.
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
      },
    });

    // ==================== API GATEWAY ====================

    const api = new apigatewayv2.HttpApi(this, 'MinuteTalkApi', {
      apiName: 'MinuteTalk AI API',
      description: 'API for generating impromptu speaking topics',
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(1),
      },
    });

    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      backendFunction,
    );

    // Proxy all routes to the Lambda backend.
    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Also serve the root path.
    api.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // ==================== OUTPUTS ====================

    new CfnOutput(this, 'ApiEndpoint', {
      value: api.url!,
      description: 'The API Gateway endpoint URL (set this as VITE_API_URL)',
      exportName: 'MinuteTalkApiEndpoint',
    });

    new CfnOutput(this, 'LambdaFunctionName', {
      value: backendFunction.functionName,
      description: 'The Lambda function name',
      exportName: 'MinuteTalkLambdaFunction',
    });

    console.log(`🚀 MinuteTalk API URL: ${api.url}`);
  }
}

// Instantiation of the CDK App for manual deployment.
import { App } from 'aws-cdk-lib';

const app = new App();
new MinuteTalkBackendStack(app, 'MinuteTalkBackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region:
      process.env.CDK_DEFAULT_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      'us-east-1',
  },
});
