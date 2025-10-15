import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

import { REQUEST_USER_KEY } from '../constants';
import type { User } from '@modules/user/entities/user.entity';

interface ExtendedRequest extends Request {
  [REQUEST_USER_KEY]?: User;
}

export const ActiveUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<ExtendedRequest>();
    const user: User | undefined = request[REQUEST_USER_KEY];
    return field ? user?.[field] : user;
  },
);
