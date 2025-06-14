import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';
import { config } from 'dotenv';

config();

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
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const rdsSecurityGroup = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Allow database access',
      allowAllOutbound: true,
    });

    rdsSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5432),
      'Allow PostgreSQL access',
    );

    this.databaseInstance = new rds.DatabaseInstance(this, 'CartPostgres', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_11,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      securityGroups: [rdsSecurityGroup],
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

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc,
        description: 'Allow Lambda access to RDS',
        allowAllOutbound: true,
      },
    );

    lambdaSecurityGroup.addIngressRule(
      rdsSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow Lambda to access PostgreSQL',
    );

    this.cartFunction = new lambda.Function(this, 'ProductCartFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      code: lambda.Code.fromAsset('dist'),
      handler: 'main.handler',
      vpc,
      allowPublicSubnet: true,
      securityGroups: [lambdaSecurityGroup],
    });

    this.databaseInstance.connections.allowDefaultPortFrom(this.cartFunction);
    dbSecrets.grantRead(this.cartFunction);
  }
}
