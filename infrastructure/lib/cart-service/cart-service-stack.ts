import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { config } from 'dotenv';
import { Injectable } from '@nestjs/common';

config();

@Injectable()
export class CartServiceStack extends cdk.Stack {
  readonly cartFunction: lambda.Function;
  readonly databaseInstance: rds.DatabaseInstance;

  constructor(scope: cdk.App, id: string) {
    super(scope, id, {});

    const dbSecrets = new secretsManager.Secret(this, 'CartServiceDbSecret', {
      secretName: process.env.DB_SECRET_NAME!,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: process.env.DB_SECRET_USERNAME!,
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password',
      },
    });

    const vpc = new ec2.Vpc(this, 'CartServiceVpc', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    new ec2.InterfaceVpcEndpoint(this, 'SecretsManagerEndpoint', {
      vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      privateDnsEnabled: true,
    });

    this.databaseInstance = new rds.DatabaseInstance(this, 'CartPostgres', {
      databaseName: process.env.DB_NAME!,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_11,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      credentials: rds.Credentials.fromSecret(dbSecrets),
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      autoMinorVersionUpgrade: true,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      deletionProtection: false,
    });

    this.cartFunction = new lambda.Function(this, 'ProductCartFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'main.handler',
      vpc,
      allowPublicSubnet: true,
      securityGroups: [this.databaseInstance.connections.securityGroups[0]],
      timeout: cdk.Duration.seconds(30),
      environment: {
        DB_SECRET_NAME: dbSecrets.secretName,
        DB_HOST: this.databaseInstance.dbInstanceEndpointAddress,
        DB_PORT: this.databaseInstance.dbInstanceEndpointPort,
        DB_NAME: process.env.DB_NAME!,
        AUTH_USERNAME: process.env.AUTH_USERNAME!,
        AUTH_PASSWORD: process.env.AUTH_PASSWORD!,
        APP_URL: process.env.APP_URL!,
      },
    });

    this.databaseInstance.connections.allowDefaultPortFrom(this.cartFunction);
    dbSecrets.grantRead(this.cartFunction);
  }
}
