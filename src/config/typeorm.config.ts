import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '@modules/user/entities/user.entity';
import { MagicLink } from '@modules/auth/entities/magic-link.entity';
import { Marker } from '@modules/marker/entities/marker.entity';

config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  entities: [User, MagicLink, Marker],
  migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
  synchronize: false,
});
