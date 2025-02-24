import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // Import ValidationPipe
import * as express from 'express';
import { seedAdminUser } from './seed/admin.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Increase request body size limits
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS for frontend interaction
  app.enableCors({
    origin: 'http://localhost:3000', // Your frontend URL
    methods: 'GET,POST,PUT,DELETE,PATCH',
    credentials: true,
  });

  // Enable global validation pipe for validating incoming requests
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Strips properties that are not part of the DTO
    forbidNonWhitelisted: true, // Throws an error if a property that is not in the DTO is present
    transform: true, // Automatically transforms payload to DTO class instances
  }));

  await app.listen(3001);
  
  // Seed default admin account
  await seedAdminUser(app);
}
bootstrap();
