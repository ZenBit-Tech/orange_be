import { Example } from '@modules/example/entities/example.entity';
import { User } from '@database/entities/user.entity';
import { LoginToken } from '@database/entities/login-token.entity';

export const globalEntities = [Example, User, LoginToken];
