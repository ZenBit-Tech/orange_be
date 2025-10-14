import { registerAs } from '@nestjs/config';
import { Example } from '../modules/example/entities/example.entity';
import { User } from '@modules/user/entities/user.entity';
import { MagicLink } from '@modules/auth/entities/magic-link.entity';

export const databaseConfig = registerAs('database', () => ({
  type: 'mysql' as const,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ailab',
  autoLoadEntities: true,
  synchronize: true,
  entities: [Example, User, MagicLink],
  migrations: [
    '@src/database/migrations/*.ts',
    '@dist/database/migrations/*.js',
  ],
}));
