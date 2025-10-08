import { DataSource } from 'typeorm';
import { User } from '@modules/user/entities/user.entity';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'rootroot',
  database: process.env.DB_NAME || 'ailab',
  entities: [User],
  migrations: ['src/database/migrations/*.ts'],
});
