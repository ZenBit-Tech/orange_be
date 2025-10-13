import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { createMock } from '@golevelup/ts-jest';
import { ConfigModule } from '@nestjs/config';

import { JwtAuthGuard } from '@modules/files/guards/jwt-auth.guard';
import jwtConfig from '@config/jwt.config';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [jwtConfig],
        }),
      ],
      providers: [
        JwtAuthGuard,

        {
          provide: JwtService,
          useValue: createMock<JwtService>(),
        },
        {
          provide: Reflector,
          useValue: createMock<Reflector>(),
        },
      ],
    }).compile();

    guard = moduleRef.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = moduleRef.get<Reflector>(Reflector);
    mockExecutionContext = createMock<ExecutionContext>();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access to public routes', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
  });

  it('should not allow access without a token', async () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);
    jest.spyOn(guard as any, 'getTokenFromCookies').mockReturnValue(undefined);

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException('Authorization token is required'),
    );
  });
});
