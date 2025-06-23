import { NestFactory } from '@nestjs/core';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { bootstrapLambda } from './bootstrap-lambda';

if (process.env.NODE_ENV === 'local') {
  async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    await app.listen(4200);
  }

  bootstrap();
}

export const handler: Handler = async (
  event: any,
  context: Context,
  callback: Callback,
) => {
  console.log('Event:', event);
  const server = await bootstrapLambda();
  return server(event, context, callback);
};
