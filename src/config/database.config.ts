import { registerAs } from '@nestjs/config';
import { Example } from '../modules/example/entities/example.entity';

export default registerAs('database', () => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'ailab',
  autoLoadEntities: true,
  synchronize: true,
  entities: [Example],
  migrations: ['src/database/migrations/*.ts'],
}));
