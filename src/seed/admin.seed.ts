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
    try {
      const existingAdmin = await usersService.findOneByEmail(adminEmail);
      
      // If admin exists but doesn't have admin role, update it
      if (existingAdmin.role !== 'admin') {
        await usersService.updateUser(existingAdmin._id.toString(), { role: 'admin' });
        logger.log(`Updated existing user ${adminEmail} to have admin role`);
      } else {
        logger.log('Admin account already exists with correct role');
      }
    } catch (error) {
      // Not found, create admin account
      const newAdmin = await usersService.create(
        adminEmail, 
        'admin', 
        adminPassword,
        'admin' // Explicitly set admin role
      );
      logger.log(`Admin account created with ID: ${newAdmin._id}`);
    }
  } catch (creationError) {
    logger.error('Error managing admin account', creationError);
  }
}