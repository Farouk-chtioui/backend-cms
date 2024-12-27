import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    // Configure PassportModule with session if needed
    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),
    
    // JWT Module configuration with async options
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRATION', '60m'),
        },
        verifyOptions: {
          ignoreExpiration: false,
        },
      }),
    }),
    
    // Import UsersModule for authentication dependencies
    UsersModule,
  ],
  providers: [
    AuthService, 
    LocalStrategy, 
    JwtStrategy,
    // Add any additional providers here
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule], // Export JwtModule if needed in other modules
})
export class AuthModule {}