/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { UserService } from '../user.service';
import { User } from '../entities/user.entity';

describe('UserService', () => {
  let service;
  let repository;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const createUserDto = {
        email: 'test@example.com',
        fullName: 'Test User',
        googleId: 'google-123',
      };

      const mockUser = {
        id: 'user-123',
        ...createUserDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(repository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should create user with minimal data', async () => {
      const createUserDto = {
        email: 'test@example.com',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(repository.create).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const email = 'test@example.com';
      const mockUser = {
        id: 'user-123',
        email,
        fullName: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const email = 'nonexistent@example.com';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { email } });
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and save user', async () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Updated Name',
      };

      mockRepository.save.mockResolvedValue(user);

      const result = await service.update(user);

      expect(repository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });

    it('should update user with new data', async () => {
      const user = {
        id: 'user-123',
        email: 'newemail@example.com',
        fullName: 'New Name',
        googleId: 'google-456',
      };

      mockRepository.save.mockResolvedValue(user);

      const result = await service.update(user);

      expect(repository.save).toHaveBeenCalledWith(user);
      expect(result).toEqual(user);
    });
  });

  describe('getMe', () => {
    it('should return user when found', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getMe(userId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw BadRequestException when user not found', async () => {
      const userId = 'nonexistent-id';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe(userId)).rejects.toThrow(BadRequestException);
      await expect(service.getMe(userId)).rejects.toThrow('User not found');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('findByFacebookId', () => {
    it('should find user by facebook id', async () => {
      const facebookId = 'facebook-123';
      const mockUser = {
        id: 'user-123',
        facebookId,
        email: 'test@example.com',
        fullName: 'Test User',
      };

      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByFacebookId(facebookId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { facebookId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found by facebook id', async () => {
      const facebookId = 'nonexistent-facebook-id';

      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByFacebookId(facebookId);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { facebookId },
      });
      expect(result).toBeNull();
    });
  });

  describe('createFacebookUser', () => {
    it('should create facebook user with complete profile', async () => {
      const profile = {
        id: 'facebook-123',
        email: 'facebook@example.com',
        fullName: 'Facebook User',
      };

      const mockUser = {
        id: 'user-123',
        facebookId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.createFacebookUser(profile);

      expect(repository.create).toHaveBeenCalledWith({
        facebookId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
      });
      expect(repository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should create facebook user with minimal profile', async () => {
      const profile = {
        id: 'facebook-456',
        email: 'minimal@facebook.com',
      };

      const mockUser = {
        id: 'user-456',
        facebookId: profile.id,
        email: profile.email,
        fullName: undefined,
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.createFacebookUser(profile);

      expect(repository.create).toHaveBeenCalledWith({
        facebookId: profile.id,
        email: profile.email,
        fullName: undefined,
      });
      expect(result).toEqual(mockUser);
    });

    it('should handle generated facebook email', async () => {
      const profile = {
        id: 'facebook-789',
        email: 'facebook-789@facebook.com',
        fullName: 'No Email User',
      };

      const mockUser = {
        id: 'user-789',
        facebookId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
      };

      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.createFacebookUser(profile);

      expect(repository.create).toHaveBeenCalledWith({
        facebookId: profile.id,
        email: profile.email,
        fullName: profile.fullName,
      });
      expect(result).toEqual(mockUser);
    });
  });
});
