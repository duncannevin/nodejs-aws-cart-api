import { Module } from '@nestjs/common';

import { AppController } from './app.controller';

import { CartModule } from './cart/cart.module';
import { AuthModule } from './auth/auth.module';
import { OrderModule } from './order/order.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';

@Module({
  imports: [
    AuthModule,
    CartModule,
    OrderModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: undefined,
      useFactory: async () => {
        const secretName = process.env.DB_SECRET_NAME;
        console.log(
          'Fetching database credentials from AWS Secrets Manager...',
          secretName,
        );

        const client = new SecretsManagerClient({
          region: 'us-west-2',
        } as any);
        const command = new GetSecretValueCommand({
          SecretId: secretName,
        });

        try {
          const secretValue: any = await client.send(command as any);
          console.log('Secret value retrieved:', secretValue);

          if (secretValue.SecretString) {
            const secretData = JSON.parse(secretValue.SecretString);
            console.log(
              'Database credentials retrieved successfully.',
              secretData,
            );
            return {
              type: 'postgres',
              host: process.env.DB_HOST!,
              port: parseInt(process.env.DB_PORT!),
              username: secretData.username,
              password: secretData.password,
              database: process.env.DB_NAME!,
              entities: ['**/*.entity{.ts,.js}'],
              synchronize: true,
            };
          } else {
            throw new Error('SecretString is empty');
          }
        } catch (error) {
          console.error('Error retrieving secret:', error);
          throw error;
        }
      },
    }),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
