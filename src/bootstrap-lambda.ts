import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import * as serverlessExpress from '@codegenie/serverless-express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

let cachedServer: any;

export const bootstrapLambda = async () => {
  if (!cachedServer) {
    const expressApp = express();
    const expressAdapter = new ExpressAdapter(expressApp);
    const nestApp = await NestFactory.create(AppModule, expressAdapter);
    nestApp.enableCors();

    await nestApp.init();

    cachedServer = serverlessExpress.configure({ app: expressApp });

    return cachedServer;
  }

  return cachedServer;
};
