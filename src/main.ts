import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MINIO_TOKEN } from './minio/minio.decorator';
import * as Minio from 'minio';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const minioClient = app.get<Minio.Client>(MINIO_TOKEN);
  try {
    await minioClient.listBuckets();
    console.log('MinIO connection successful');
  } catch (error) {
    console.error(
      'MinIO connection failed:',
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application started successfully on port: ${port}`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
