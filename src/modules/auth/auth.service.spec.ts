import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '@modules/user/user.service';
import { User } from '@modules/user/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { MagicLink } from './entities/magic-link.entity';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: () => 'mocked-token-123',
  })),
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;
  let magicLinkRepository: Repository<MagicLink>;
  let mockSendMail: jest.Mock;

  const mockGoogleUser: User = {
    id: '1',
    email: 'test@example.com',
    googleId: 'google123',
    linkedinId: 'null',
    fullName: 'Google User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLinkedInUser: User = {
    id: '2',
    email: 'linkedin@example.com',
    googleId: 'null',
    linkedinId: 'linkedin456',
    fullName: 'LinkedIn User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockGoogleProfile = {
    id: 'google123',
    email: 'test@example.com',
    fullName: 'Google User',
  };

  const mockLinkedInProfile = {
    id: 'linkedin456',
    email: 'linkedin@example.com',
    fullName: 'LinkedIn User',
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMagicLink: MagicLink = {
    id: 'uuid-1',
    userId: mockGoogleUser.id,
    user: mockGoogleUser,
    token: 'mocked-token-123',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };

  beforeEach(async () => {
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail,
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByGoogleId: jest.fn(),
            createGoogleUser: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mocked-jwt-token'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                FRONTEND_URL: 'http://localhost:3000',
                MAIL_FROM: 'noreply@example.com',
              };
              return config[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(MagicLink),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
    magicLinkRepository = module.get<Repository<MagicLink>>(
      getRepositoryToken(MagicLink),
    );

    jest.spyOn(crypto, 'randomBytes').mockImplementation(() => {
      return {
        toString: () => 'mocked-token-123',
      };
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing user with token', async () => {
    const findByGoogleIdSpy = jest
      .spyOn(userService, 'findByGoogleId')
      .mockResolvedValueOnce(mockLinkedInUser);

    const createGoogleUserSpy = jest.spyOn(userService, 'createGoogleUser');

    const signSpy = jest
      .spyOn(jwtService, 'sign')
      .mockReturnValue('mocked-jwt-token');

    const result: AuthResponseDto =
      await authService.validateOAuthLogin(mockGoogleProfile);

    expect(findByGoogleIdSpy).toHaveBeenCalledWith('google123');
    expect(createGoogleUserSpy).not.toHaveBeenCalled();
    expect(signSpy).toHaveBeenCalledWith({
      sub: mockGoogleUser.id,
      email: mockGoogleUser.email,
    });
    expect(result).toEqual({
      accessToken: 'mocked-jwt-token',
      user: mockGoogleUser,
    });
  });

  it('should create a new user if not found by Google ID', async () => {
    const findByGoogleIdSpy = jest
      .spyOn(userService, 'findByGoogleId')
      .mockResolvedValueOnce(null);

    const createUser = jest
      .spyOn(userService, 'createGoogleUser')
      .mockResolvedValueOnce(mockGoogleUser);

    const result: AuthResponseDto =
      await authService.validateOAuthLogin(mockGoogleUser);

    expect(findByGoogleIdSpy).toHaveBeenCalledWith('google123');
    expect(createUser).toHaveBeenCalledWith(mockGoogleProfile);
    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user).toEqual(mockGoogleUser);
  });

  it('should create magic link and send email', async () => {
    const findMailSpy = jest
      .spyOn(userService, 'findByEmail')
      .mockResolvedValue(mockGoogleUser);

    const createSpy = jest
      .spyOn(magicLinkRepository, 'create')
      .mockReturnValue(mockMagicLink);

    const saveSpy = jest
      .spyOn(magicLinkRepository, 'save')
      .mockResolvedValue(mockMagicLink);

    const result = await authService.sendMagicLink(mockGoogleUser.email);

    expect(findMailSpy).toHaveBeenCalledWith(mockGoogleUser.email);
    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: mockGoogleUser.id,
        token: 'mocked-token-123',
      }),
    );
    expect(saveSpy).toHaveBeenCalledWith(mockMagicLink);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: mockGoogleUser.email,
        html: expect.stringContaining('mocked-token-123') as string,
      }),
    );
    expect(result).toEqual({
      message: `Sign-in link sent to ${mockGoogleUser.email}`,
    });
  });

  it('should create user if not exists before sending magic link', async () => {
    jest.spyOn(userService, 'findByEmail').mockResolvedValueOnce(null);
    jest.spyOn(userService, 'create').mockResolvedValueOnce(mockGoogleUser);
    jest
      .spyOn(magicLinkRepository, 'create')
      .mockReturnValueOnce(mockMagicLink);

    const result = await authService.sendMagicLink(mockGoogleUser.email);

    const createSpy = jest
      .spyOn(userService, 'create')
      .mockResolvedValueOnce(mockGoogleUser);

    expect(createSpy).toHaveBeenCalledWith({ email: mockGoogleUser.email });
    expect(result.message).toBe(`Sign-in link sent to ${mockGoogleUser.email}`);
  });

  it('should verify valid token and return JWT', async () => {
    jest
      .spyOn(userService, 'findByEmail')
      .mockResolvedValueOnce(mockGoogleUser);
    jest
      .spyOn(magicLinkRepository, 'findOne')
      .mockResolvedValueOnce(mockMagicLink);
    jest
      .spyOn(magicLinkRepository, 'remove')
      .mockResolvedValueOnce(mockMagicLink);

    const result = await authService.verifyToken(
      mockMagicLink.token,
      mockGoogleUser.email,
    );
    const removeSpy = jest
      .spyOn(magicLinkRepository, 'remove')
      .mockResolvedValueOnce(mockMagicLink);

    expect(removeSpy).toHaveBeenCalled();
    expect(result).toEqual({
      accessToken: 'mocked-jwt-token',
      email: mockGoogleUser.email,
    });
  });
});
