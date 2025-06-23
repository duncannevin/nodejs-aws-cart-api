#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayStack } from '../lib/api-gateway/api-gateway-stack';
import { CartServiceStack } from '../lib/cart-service/cart-service-stack';

const app = new cdk.App();

const apiGatewayStack = new ApiGatewayStack(app, 'ProductCartApiGateway');

const productCartServiceStack = new CartServiceStack(
  app,
  'ProductCartServiceStack',
);
apiGatewayStack.addProxy(productCartServiceStack.cartFunction);
