import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RepositoriesModule } from './modules/repositories/repositories.module';
import { MobileAppModule } from './modules/mobile-app/mobile-app.module';
import { LiveUpdatesGateway } from './live-updates/live-updates.gateway';
import { AppLayoutModule } from './modules/appLayout/appLayout.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        index: false,
        fallthrough: true,
      },
    }),
    UsersModule,
    AuthModule,
    RepositoriesModule,
    MobileAppModule,
    AppLayoutModule, 
  ],
  providers: [LiveUpdatesGateway],
})
export class AppModule {}