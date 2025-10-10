import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import jwtConfig from '@config/jwt.config';
import { REQUEST_USER_KEY } from '@common/constants';
import { ActiveUserData } from '@common/interfaces/active-user-data.interface';
import { RedisService } from '@modules/redis/redis.service';

interface UserRequest extends Request {
  [REQUEST_USER_KEY]?: ActiveUserData;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<UserRequest>();
    const token = this.getTokenFromCookies(request);
    if (!token) {
      throw new UnauthorizedException('Authorization token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<ActiveUserData>(
        token,
        this.jwtConfiguration,
      );

      const isValidToken = await this.redisService.validate(
        `user-${payload.id}`,
        token,
      );
      if (!isValidToken) {
        throw new UnauthorizedException('Authorization token is not valid');
      }

      request[REQUEST_USER_KEY] = payload;
    } catch (error) {
      throw new UnauthorizedException(
        `Authorization token is not valid. Error: ${error}`,
      );
    }

    return true;
  }

  private getTokenFromHeader(request: Request) {
    const [, token] = request.headers.authorization?.split(' ') ?? [];
    return token;
  }

  private getTokenFromCookies(request: Request): string | undefined {
    const cookies = request.cookies as { jwt?: string };
    return cookies.jwt;
  }
}
