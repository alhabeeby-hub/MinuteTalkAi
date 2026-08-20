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
 * The infrastructure uses Amplify Gen 2 patterns for seamless integration
 * with AWS Amplify Hosting.
 * 
 * Prerequisites:
 * - AWS CDK v2 installed
 * - Python 3.11+ for Lambda runtime
 * - Node.js 18+ for CDK
 * 
 * Deployment:
 * - Amplify automatically deploys this infrastructure when connected to GitHub
 * - Or deploy manually with: cd amplify && npm run build && cdk deploy
 */

import { 
  Stack, 
  StackProps, 
  Duration,
  aws_lambda as lambda,
  aws_apigatewayv2 as apigatewayv2,
  aws_apigatewayv2_integrations as integrations,
  aws_iam as iam,
  aws_s3_assets as s3_assets,
  RemovalPolicy,
  CfnOutput,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * MinuteTalk Backend Stack
 * 
 * This stack creates:
 * - Lambda function with FastAPI + Mangum
 * - API Gateway HTTP API with CORS support
 * - Proper IAM role for Lambda execution
 */
export class MinuteTalkBackendStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // ==================== LAMBDA FUNCTION ====================
    
    /**
     * Create the Lambda function that runs our FastAPI backend.
     * 
     * Configuration:
     * - Runtime: Python 3.11 (latest LTS)
     * - Handler: lambda_function.lambda_handler (entry point)
     * - Timeout: 30 seconds (plenty for API calls)
     * - Memory: 512MB (sufficient for FastAPI)
     * 
     * The function code is packaged from the backend/ directory.
     */
    
    // Create an asset for the Lambda function code
    // This packages the entire backend directory for deployment
    const lambdaCode = new s3_assets.Asset(this, 'LambdaCodeAsset', {
      path: path.join(__dirname, '..', '..', 'backend', 'deployment.zip'),
    });

    // Create the Lambda function
    const backendFunction = new lambda.Function(this, 'MinuteTalkBackend', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'app.main.handler',  // Points to Mangum handler in main.py
      code: lambda.Code.fromAsset(
        path.join(__dirname, '..', '..', 'backend', 'deployment.zip')
      ),
      timeout: Duration.seconds(30),
      memorySize: 512,
      description: 'MinuteTalk AI FastAPI Backend Function',
      // Environment variables for the Lambda function
      environment: {
        PYTHONUNBUFFERED: '1',
        GROQ_API_KEY: process.env.GROQ_API_KEY || '',
      },
    });

    // ==================== API GATEWAY ====================
    
    /**
     * Create an HTTP API Gateway (v2) to expose the Lambda function.
     * 
     * This creates a RESTful API endpoint that:
     * - Proxies all requests to the Lambda function
     * - Handles CORS for frontend access
     * - Uses the default /{proxy+} catch-all route
     */

    // Create the HTTP API
    const api = new apigatewayv2.HttpApi(this, 'MinuteTalkApi', {
      apiName: 'MinuteTalk AI API',
      description: 'API for generating impromptu speaking topics',
      // Enable CORS to allow frontend to call the API
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowOrigins: ['*'],
        maxAge: Duration.days(1),
      },
    });

    // Add the Lambda as the integration for all routes
    // This proxies all /api/* requests to the FastAPI backend
    const lambdaIntegration = new integrations.HttpLambdaIntegration(
      'LambdaIntegration',
      backendFunction
    );

    // Add routes - proxy all requests to Lambda
    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // Also add the root path
    api.addRoutes({
      path: '/',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // ==================== OUTPUTS ====================
    
    /**
     * Output the API endpoint URL for use in the frontend
     */
    new CfnOutput(this, 'ApiEndpoint', {
      value: api.url!,
      description: 'The API Gateway endpoint URL',
      exportName: 'MinuteTalkApiEndpoint',
    });

    new CfnOutput(this, 'LambdaFunctionName', {
      value: backendFunction.functionName,
      description: 'The Lambda function name',
      exportName: 'MinuteTalkLambdaFunction',
    });

    // Print the API URL for reference
    console.log(`🚀 MinuteTalk API URL: ${api.url}`);
  }
}

// Export the stack class for use in CDK
export { MinuteTalkBackendStack as backendStack };

// Instantiation of the CDK App for manual deployment
import { App } from 'aws-cdk-lib';

const app = new App();
new MinuteTalkBackendStack(app, 'MinuteTalkBackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
    region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  }
});
