/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { OAuthUserDto } from '@database/dtos/oauth-user.dto';
import { User } from '@modules/user/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;

  type GoogleCallbackRequest = Parameters<typeof controller.googleCallback>[0];
  type LinkedInCallbackRequest = Parameters<
    typeof controller.linkedInCallback
  >[0];
  type FacebookCallbackRequest = Parameters<
    typeof controller.facebookCallback
  >[0];

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    fullName: 'Test User',
    googleId: '123456',
    linkedInId: null,
    facebookId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;

  const mockAuthService = {
    findOrCreateUser: jest.fn(),
    validateOAuthFacebook: jest.fn(),
    sendMagicLink: jest.fn(),
    verifyToken: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('googleLogin', () => {
    it('should be defined', () => {
      expect(controller.googleLogin).toBeDefined();
    });

    it('should trigger Google OAuth guard', () => {
      const result = controller.googleLogin();
      expect(result).toBeUndefined();
    });
  });

  describe('googleCallback', () => {
    let mockResponse: Partial<Response>;
    let mockRequest: Partial<Request> & { user: OAuthUserDto | null };

    beforeEach(() => {
      mockResponse = {
        redirect: jest.fn(),
      };
      mockRequest = {
        user: {
          id: '123456',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      configService.get.mockReturnValue('http://localhost:3000');
    });

    it('should redirect to frontend with token on successful authentication', async () => {
      const mockAccessToken = 'mock-jwt-token';
      authService.findOrCreateUser.mockResolvedValue({
        accessToken: mockAccessToken,
        user: mockUser,
      });

      await controller.googleCallback(
        mockRequest as GoogleCallbackRequest,
        mockResponse as Response,
      );

      expect(authService.findOrCreateUser).toHaveBeenCalledWith(
        mockRequest.user,
        'google',
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth-verify?token=${mockAccessToken}`,
      );
    });

    it('should redirect with error when user is not found in request', async () => {
      mockRequest.user = null;

      await controller.googleCallback(
        mockRequest as GoogleCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=no_user',
      );
      expect(authService.findOrCreateUser).not.toHaveBeenCalled();
    });

    it('should redirect with error when FRONTEND_URL is not defined', async () => {
      configService.get.mockReturnValue(undefined);
      authService.findOrCreateUser.mockResolvedValue({
        accessToken: 'token',
        user: mockUser,
      });

      await controller.googleCallback(
        mockRequest as GoogleCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'undefined?error=auth_failed',
      );
    });

    it('should handle errors during authentication', async () => {
      configService.get.mockReturnValue('http://localhost:3000');
      authService.findOrCreateUser.mockRejectedValue(
        new Error('Database error'),
      );

      await controller.googleCallback(
        mockRequest as GoogleCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=auth_failed',
      );
    });
  });

  describe('linkedInLogin', () => {
    it('should be defined', () => {
      expect(controller.linkedInLogin).toBeDefined();
    });

    it('should trigger LinkedIn OAuth guard', () => {
      const result = controller.linkedInLogin();
      expect(result).toBeUndefined();
    });
  });

  describe('linkedInCallback', () => {
    let mockResponse: Partial<Response>;
    let mockRequest: Partial<Request> & { user: OAuthUserDto | null };

    beforeEach(() => {
      mockResponse = {
        redirect: jest.fn(),
      };
      mockRequest = {
        user: {
          id: 'linkedin-123',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      configService.get.mockReturnValue('http://localhost:3000');
    });

    it('should redirect to frontend with token on successful authentication', async () => {
      const mockAccessToken = 'mock-jwt-token';
      authService.findOrCreateUser.mockResolvedValue({
        accessToken: mockAccessToken,
        user: mockUser,
      });

      await controller.linkedInCallback(
        mockRequest as LinkedInCallbackRequest,
        mockResponse as Response,
      );

      expect(authService.findOrCreateUser).toHaveBeenCalledWith(
        mockRequest.user,
        'linkedin',
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth-verify?token=${mockAccessToken}`,
      );
    });

    it('should redirect with error when user is not found', async () => {
      mockRequest.user = null;

      await controller.linkedInCallback(
        mockRequest as LinkedInCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=no_user',
      );
    });

    it('should handle errors during LinkedIn authentication', async () => {
      authService.findOrCreateUser.mockRejectedValue(new Error('Auth error'));

      await controller.linkedInCallback(
        mockRequest as LinkedInCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=auth_failed',
      );
    });
  });

  describe('facebookLogin', () => {
    it('should be defined', () => {
      expect(controller.facebookLogin).toBeDefined();
    });

    it('should trigger Facebook OAuth guard', () => {
      const result = controller.facebookLogin();
      expect(result).toBeUndefined();
    });
  });

  describe('facebookCallback', () => {
    let mockResponse: Partial<Response>;
    let mockRequest: Partial<Request> & { user: OAuthUserDto | null };

    beforeEach(() => {
      mockResponse = {
        redirect: jest.fn(),
      };
      mockRequest = {
        user: {
          id: 'fb-123',
          email: 'test@example.com',
          fullName: 'Test User',
        },
      };

      configService.get.mockReturnValue('http://localhost:3000');
    });

    it('should redirect to frontend with token on successful authentication', async () => {
      const mockAccessToken = 'mock-jwt-token';
      authService.validateOAuthFacebook.mockResolvedValue({
        accessToken: mockAccessToken,
        user: mockUser,
      });
      await controller.facebookCallback(
        mockRequest as FacebookCallbackRequest,
        mockResponse as Response,
      );

      expect(authService.validateOAuthFacebook).toHaveBeenCalledWith(
        mockRequest.user,
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        `http://localhost:3000/auth-verify?token=${mockAccessToken}`,
      );
    });

    it('should redirect with error when user is not found', async () => {
      mockRequest.user = null;

      await controller.facebookCallback(
        mockRequest as FacebookCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=no_user',
      );
    });

    it('should handle errors during Facebook authentication', async () => {
      authService.validateOAuthFacebook.mockRejectedValue(
        new Error('FB Auth error'),
      );

      await controller.facebookCallback(
        mockRequest as FacebookCallbackRequest,
        mockResponse as Response,
      );

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'http://localhost:3000?error=auth_failed',
      );
    });
  });

  describe('sendMagicLink', () => {
    it('should send magic link successfully', async () => {
      const email = 'test@example.com';
      const mockResponse = {
        message: 'Magic link sent to your email.',
        token: 'mock-token-123',
      };

      authService.sendMagicLink.mockResolvedValue(mockResponse);

      const result = await controller.sendMagicLink({ email });

      expect(authService.sendMagicLink).toHaveBeenCalledWith(email);
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors when sending magic link', async () => {
      const email = 'invalid@example.com';
      authService.sendMagicLink.mockRejectedValue(
        new Error('Email send failed'),
      );

      await expect(controller.sendMagicLink({ email })).rejects.toThrow(
        'Email send failed',
      );
    });

    it('should validate email format', async () => {
      const email = 'valid@example.com';
      const mockResponse = {
        message: 'Magic link sent to your email.',
        token: 'mock-token-123',
      };

      authService.sendMagicLink.mockResolvedValue(mockResponse);

      await controller.sendMagicLink({ email });

      expect(authService.sendMagicLink).toHaveBeenCalledWith(email);
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully and return JWT', async () => {
      const token = 'valid-token';
      const email = 'test@example.com';
      const mockResponse = {
        accessToken: 'jwt-token',
        email,
      };
      authService.verifyToken.mockResolvedValue(mockResponse);

      const result = await controller.verifyToken(token, email);

      expect(authService.verifyToken).toHaveBeenCalledWith(token, email);
      expect(result).toEqual(mockResponse);
      expect(result.accessToken).toBe('jwt-token');
      expect(result.email).toBe(email);
    });

    it('should handle invalid token', async () => {
      const token = 'invalid-token';
      const email = 'test@example.com';
      authService.verifyToken.mockRejectedValue(new Error('Invalid token'));

      await expect(controller.verifyToken(token, email)).rejects.toThrow(
        'Invalid token',
      );
    });

    it('should handle expired token', async () => {
      const token = 'expired-token';
      const email = 'test@example.com';
      authService.verifyToken.mockRejectedValue(new Error('Token expired'));

      await expect(controller.verifyToken(token, email)).rejects.toThrow(
        'Token expired',
      );
    });

    it('should handle mismatched email', async () => {
      const token = 'valid-token';
      const email = 'wrong@example.com';
      authService.verifyToken.mockRejectedValue(new Error('Email mismatch'));

      await expect(controller.verifyToken(token, email)).rejects.toThrow(
        'Email mismatch',
      );
    });
  });
});
