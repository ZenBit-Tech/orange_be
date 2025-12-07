/* eslint-disable */
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '../guards/auth.guard';

describe('AuthGuard', () => {
  let guard;
  let jwtService;
  let configService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jwtService = mockJwtService;
    configService = mockConfigService;
    guard = new AuthGuard(jwtService, configService);

    configService.get.mockReturnValue('test-secret');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    let mockContext;
    let mockRequest;

    beforeEach(() => {
      mockRequest = {
        headers: {},
        user: undefined,
      };

      mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      };
    });

    it('should be defined', () => {
      expect(guard).toBeDefined();
    });

    it('should return true and attach user to request when token is valid', async () => {
      const mockPayload = {
        sub: 'user-123',
        email: 'test@example.com',
        iat: 1234567890,
        exp: 1234567990,
      };

      mockRequest.headers.authorization = 'Bearer valid-token';
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
    });

    it('should throw UnauthorizedException when authorization header is missing', async () => {
      mockRequest.headers.authorization = undefined;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing or invalid Authorization header',
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header does not start with Bearer', async () => {
      mockRequest.headers.authorization = 'Basic some-token';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Missing or invalid Authorization header',
      );
      expect(jwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when authorization header is malformed', async () => {
      mockRequest.headers.authorization = 'Bearer';

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when token is invalid', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid or expired token',
      );
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('invalid-token', {
        secret: 'test-secret',
      });
    });

    it('should throw UnauthorizedException when token is expired', async () => {
      mockRequest.headers.authorization = 'Bearer expired-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should handle token with extra spaces', async () => {
      const mockPayload = {
        sub: 'user-456',
        email: 'test2@example.com',
      };

      mockRequest.headers.authorization = 'Bearer  token-with-spaces';
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('', {
        secret: 'test-secret',
      });
    });

    it('should extract correct token from authorization header', async () => {
      const mockPayload = {
        sub: 'user-789',
        email: 'test3@example.com',
      };

      mockRequest.headers.authorization =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockContext);

      expect(jwtService.verifyAsync).toHaveBeenCalledWith(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
        { secret: 'test-secret' },
      );
    });

    it('should use JWT_SECRET from config service', async () => {
      const customSecret = 'custom-jwt-secret';
      configService.get.mockReturnValue(customSecret);

      const mockPayload = {
        sub: 'user-999',
        email: 'test4@example.com',
      };

      mockRequest.headers.authorization = 'Bearer test-token';
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockContext);

      expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
      expect(jwtService.verifyAsync).toHaveBeenCalledWith('test-token', {
        secret: customSecret,
      });
    });

    it('should not modify request when token verification fails', async () => {
      mockRequest.headers.authorization = 'Bearer invalid-token';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid'));

      const originalUser = mockRequest.user;

      await expect(guard.canActivate(mockContext)).rejects.toThrow();

      expect(mockRequest.user).toBe(originalUser);
    });

    it('should handle payload without optional fields', async () => {
      const mockPayload = {
        sub: 'user-111',
        email: 'minimal@example.com',
      };

      mockRequest.headers.authorization = 'Bearer minimal-token';
      jwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockRequest.user.iat).toBeUndefined();
      expect(mockRequest.user.exp).toBeUndefined();
    });

    it('should handle empty string after Bearer', async () => {
      mockRequest.headers.authorization = 'Bearer ';
      jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        'Invalid or expired token',
      );
    });

    it('should call switchToHttp and getRequest correctly', async () => {
      mockRequest.headers.authorization = 'Bearer test-token';
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-123',
        email: 'test@example.com',
      });

      await guard.canActivate(mockContext);

      expect(mockContext.switchToHttp).toHaveBeenCalled();
      expect(mockContext.switchToHttp().getRequest).toHaveBeenCalled();
    });
  });
});
