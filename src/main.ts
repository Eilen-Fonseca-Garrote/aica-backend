import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import setupSwagger from './config/swagger.setup';
import { ConfigService } from '@nestjs/config';

const SWAGGER_PATH = '/docs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = app.get(ConfigService).get<number>('APP_PORT')||3030;
  const configService = app.get(ConfigService);

  console.log({
    DB_HOST: configService.get('DB_HOST'),
    DB_PORT: configService.get('DB_PORT'),
    DB_USERNAME: configService.get('DB_USERNAME'),
    DB_DATABASE: configService.get('DB_DATABASE'),
    SYNCHRO: configService.get('SYNCHRO')
  });
  setupSwagger(app, SWAGGER_PATH)

  await app.listen(port);
}
bootstrap();
