import { INestApplication, Logger } from '@nestjs/common';
import { UsersService } from '../modules/users/users.service';

export async function seedAdminUser(app: INestApplication) {
  const logger = new Logger('AdminSeed');
  const usersService = app.get(UsersService);
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    logger.error('DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD is not set in .env');
    return;
  }

  try {
    // Attempt to find existing admin account
    await usersService.findOneByEmail(adminEmail);
    logger.log('Admin account already exists');
  } catch (error) {
    // Not found, create admin account
    try {
      const newAdmin = await usersService.create(adminEmail, 'admin', adminPassword,'admin');
      logger.log(`Admin account created with ID: ${newAdmin._id}`);
    } catch (creationError) {
      logger.error('Error creating admin account', creationError);
    }
  }
}
