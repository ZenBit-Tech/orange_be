import { registerAs } from '@nestjs/config';
import { globalEntities } from '@database/entities/example-global.entities';

export default registerAs('database', () => ({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'ailab',
    autoLoadEntities: true,
    synchronize: true,
    entities: globalEntities,
    migrations: ['@src/database/migrations/*.ts', '@dist/database/migrations/*.js'],
}));