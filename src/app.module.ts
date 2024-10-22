import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
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
    UsersModule,
    AuthModule,
    RepositoriesModule,
    MobileAppModule,
    AppLayoutModule, 
  ],
  providers: [LiveUpdatesGateway],
})
export class AppModule {}
