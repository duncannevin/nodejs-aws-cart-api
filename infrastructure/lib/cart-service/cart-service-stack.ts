import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class CartServiceStack extends cdk.Stack {
  readonly cartFunction: lambda.Function;

  constructor(scope: cdk.App, id: string) {
    super(scope, id, {});


    this.cartFunction = new lambda.Function(this, 'ProductCartFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'main.handler',
    });
  }
}
