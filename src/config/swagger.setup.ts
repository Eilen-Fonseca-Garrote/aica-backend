import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export default function setupSwagger(
  app: INestApplication,
  swaggerPath: string,
) {
  //const swaggerPassword = app.get(ConfigService).get('SWAGGER_PASSWORD');
  const swaggerUrl = app.get(ConfigService).get('SWAGGER_URL');

  const options = new DocumentBuilder()
    .setTitle('Personal')
    .setDescription('### Personal API')
    .setVersion('1.0.0')
    .build();

  options.servers = [
    //{ url: 'http://192.168.205.250:8080/personal' },
    { url: swaggerUrl },
  ];
  const doc = SwaggerModule.createDocument(app, options);

  const paths = Object.keys(doc.paths).sort();
  const sortedPaths = {};
  paths.forEach((path) => {
    sortedPaths[path] = doc.paths[path];
  });
  doc.paths = sortedPaths;

  /* const schemas = Object.keys(doc.components.schemas).sort();
  const sortedSchemas = {};
  schemas.forEach((schema) => {
    sortedSchemas[schema] = doc.components.schemas[schema];
  });
  doc.components.schemas = sortedSchemas;  */

  /* if (process.env.NODE_ENV !== 'development') {
    app.use(
      [swaggerPath, `${swaggerPath}-json`],
      basicAuth({
        challenge: true,
        users: {
          admin: '1234',
        },
      }),
    );
  } */

  SwaggerModule.setup(swaggerPath, app, doc);
}
