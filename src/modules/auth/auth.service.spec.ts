import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '@modules/user/user.service';
import { User } from '@modules/user/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByGoogleId: jest.fn(),
            createGoogleUser: jest.fn(),
            findByLinkedInId: jest.fn(),
            createLinkedInUser: jest.fn(),
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
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Google OAuth', () => {
    it('should return existing user with token', async () => {
      const findByGoogleIdSpy = jest
        .spyOn(userService, 'findByGoogleId')
        .mockResolvedValueOnce(mockGoogleUser);

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

      const createGoogleUserSpy = jest
        .spyOn(userService, 'createGoogleUser')
        .mockResolvedValueOnce(mockGoogleUser);

      const signSpy = jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-jwt-token');

      const result: AuthResponseDto =
        await authService.validateOAuthLogin(mockGoogleProfile);

      expect(findByGoogleIdSpy).toHaveBeenCalledWith('google123');
      expect(createGoogleUserSpy).toHaveBeenCalledWith(mockGoogleProfile);
      expect(signSpy).toHaveBeenCalledWith({
        sub: mockGoogleUser.id,
        email: mockGoogleUser.email,
      });
      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user).toEqual(mockGoogleUser);
    });
  });

  describe('LinkedIn OAuth', () => {
    it('should return existing user with token', async () => {
      const findByLinkedInIdSpy = jest
        .spyOn(userService, 'findByLinkedInId')
        .mockResolvedValueOnce(mockLinkedInUser);

      const createLinkedInUserSpy = jest.spyOn(
        userService,
        'createLinkedInUser',
      );

      const signSpy = jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-jwt-token');

      const result: AuthResponseDto =
        await authService.validateOAuthLinkedIn(mockLinkedInProfile);

      expect(findByLinkedInIdSpy).toHaveBeenCalledWith('linkedin456');
      expect(createLinkedInUserSpy).not.toHaveBeenCalled();
      expect(signSpy).toHaveBeenCalledWith({
        sub: mockLinkedInUser.id,
        email: mockLinkedInUser.email,
      });
      expect(result).toEqual({
        accessToken: 'mocked-jwt-token',
        user: mockLinkedInUser,
      });
    });

    it('should create a new user if not found by LinkedIn ID', async () => {
      const findByLinkedInIdSpy = jest
        .spyOn(userService, 'findByLinkedInId')
        .mockResolvedValueOnce(null);

      const createLinkedInUserSpy = jest
        .spyOn(userService, 'createLinkedInUser')
        .mockResolvedValueOnce(mockLinkedInUser);

      const signSpy = jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-jwt-token');

      const result: AuthResponseDto =
        await authService.validateOAuthLinkedIn(mockLinkedInProfile);

      expect(findByLinkedInIdSpy).toHaveBeenCalledWith('linkedin456');
      expect(createLinkedInUserSpy).toHaveBeenCalledWith(mockLinkedInProfile);
      expect(signSpy).toHaveBeenCalledWith({
        sub: mockLinkedInUser.id,
        email: mockLinkedInUser.email,
      });
      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user).toEqual(mockLinkedInUser);
    });

    it('should generate JWT with correct payload for LinkedIn user', async () => {
      jest
        .spyOn(userService, 'findByLinkedInId')
        .mockResolvedValueOnce(mockLinkedInUser);

      const signSpy = jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-jwt-token');

      await authService.validateOAuthLinkedIn(mockLinkedInProfile);

      expect(signSpy).toHaveBeenCalledWith({
        sub: mockLinkedInUser.id,
        email: mockLinkedInUser.email,
      });
    });
  });

  describe('Token Generation', () => {
    it('should generate valid JWT tokens for both Google and LinkedIn', async () => {
      jest
        .spyOn(userService, 'findByGoogleId')
        .mockResolvedValueOnce(mockGoogleUser);
      jest
        .spyOn(userService, 'findByLinkedInId')
        .mockResolvedValueOnce(mockLinkedInUser);

      const signSpy = jest
        .spyOn(jwtService, 'sign')
        .mockReturnValue('mocked-jwt-token');

      const googleResult =
        await authService.validateOAuthLogin(mockGoogleProfile);
      const linkedInResult =
        await authService.validateOAuthLinkedIn(mockLinkedInProfile);

      expect(signSpy).toHaveBeenCalledTimes(2);
      expect(googleResult.accessToken).toBe('mocked-jwt-token');
      expect(linkedInResult.accessToken).toBe('mocked-jwt-token');
    });
  });
});
