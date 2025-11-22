import { AppModule } from './app.module';
import { NestFactory } from '@nestjs/core';
import { apiReference } from '@scalar/nestjs-api-reference';
import { SwaggerModule, OpenAPIObject } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const document: OpenAPIObject = SwaggerModule.createDocument(app, {
    openapi: '3.1.0',
    info: {
      title: 'MET Flight Radar API',
      version: '1.0.0',
      description: 'API Documentation',
    },
  });

  app.use('/openapi.json', (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    res.json(document);
  });

  app.use(
    '/docs',
    apiReference({
      url: '/openapi.json',
      theme: 'default',
    }),
  );

  await app.listen(process.env.PORT ? +process.env.PORT : 3000);
  console.log(
    `🚀 Server ready at http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `📄 Docs available at http://localhost:${process.env.PORT ?? 3000}/docs`,
  );
}

void bootstrap();
