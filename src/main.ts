import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS 설정 (반드시 다른 미들웨어보다 상단에 위치하는 것이 좋습니다)
  app.enableCors({
    origin: [
      'https://ourllet.junoshon.cloud', // 운영 환경
      'http://localhost:3000',          // 로컬 개발 환경 (React/Next.js 등)
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true, // 쿠키나 인증 헤더를 사용하는 경우 필수
  });

  // 2. Global Prefix 설정
  app.setGlobalPrefix('api');

  // 3. Validation Pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}

bootstrap();