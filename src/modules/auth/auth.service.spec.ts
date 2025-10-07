import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '@modules/user/user.service';
import { User } from '@modules/user/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthResponseDto } from './dto/auth-response.dto';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    googleId: 'google123',
    fullName: 'Google User',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProfile = {
    id: 'google123',
    email: 'test@example.com',
    fullName: 'Google User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findByGoogleId: jest.fn().mockResolvedValue(mockUser),
            createGoogleUser: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(() => 'mocked-jwt-token'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should return existing user with token', async () => {
    const findByGoogleIdSpy = jest
      .spyOn(userService, 'findByGoogleId')
      .mockResolvedValueOnce(mockUser);

    const createGoogleUserSpy = jest.spyOn(userService, 'createGoogleUser');

    const signSpy = jest
      .spyOn(jwtService, 'sign')
      .mockReturnValue('mocked-jwt-token');

    const result: AuthResponseDto =
      await authService.validateOAuthLogin(mockProfile);

    await authService.validateOAuthLogin(mockProfile);

    expect(findByGoogleIdSpy).toHaveBeenCalledWith('google123');
    expect(createGoogleUserSpy).not.toHaveBeenCalled();
    expect(signSpy).toHaveBeenCalledWith({
      sub: mockUser.id,
      email: mockUser.email,
    });
    expect(result).toEqual({
      accessToken: 'mocked-jwt-token',
      user: mockUser,
    });
  });

  it('should create a new user if not found by Id', async () => {
    const findByGoogleIdSpy = jest
      .spyOn(userService, 'findByGoogleId')
      .mockResolvedValueOnce(null);

    const createUser = jest
      .spyOn(userService, 'createGoogleUser')
      .mockResolvedValueOnce(mockUser);

    const result: AuthResponseDto =
      await authService.validateOAuthLogin(mockProfile);

    expect(findByGoogleIdSpy).toHaveBeenCalledWith('google123');
    expect(createUser).toHaveBeenCalledWith(mockProfile);
    expect(result.accessToken).toBe('mocked-jwt-token');
    expect(result.user).toEqual(mockUser);
  });
});
