import { DataSource } from 'typeorm';
import { globalEntities } from '@database/entities/example-global.entities';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '3306', 10),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'rootroot',
  database: process.env.DB_NAME || 'ailab',
  entities: globalEntities,
  migrations: ['src/database/migrations/*.ts'],
});