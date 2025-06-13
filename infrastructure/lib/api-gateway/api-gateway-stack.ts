import * as cdk from 'aws-cdk-lib';
import * as apiGateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class ApiGatewayStack extends cdk.Stack {
  private api: apiGateway.RestApi;

  constructor(scope: cdk.App, id: string) {
    super(scope, id, {});

    this.api = new apiGateway.RestApi(this, 'product-cart-api', {
      restApiName: 'Product Cart Service',
      description: 'This service serves product cart operations.',
      deploy: true,
    });
  }

  addProxy(func: lambda.Function) {
    const integration = new apiGateway.LambdaIntegration(func, {
      proxy: true,
    });

    this.api.root.addProxy({
      defaultIntegration: integration,
    });
  }
}
