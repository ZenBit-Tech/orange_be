/* eslint-disable */
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './user.controller';
import { UserService } from './user.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UserService>;

  const mockUserService = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    getMe: jest.fn(),
    findByFacebookId: jest.fn(),
    createFacebookUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have UserService injected', () => {
    expect(service).toBeDefined();
  });

  describe('controller structure', () => {
    it('should be tagged with "users" in Swagger', () => {
      const metadata = Reflect.getMetadata(
        'swagger/apiUseTags',
        UsersController,
      );
      expect(metadata).toEqual(['users']);
    });

    it('should have "users" as base path', () => {
      const metadata = Reflect.getMetadata('path', UsersController);
      expect(metadata).toBe('users');
    });
  });

  describe('service integration', () => {
    it('should be able to call service methods', () => {
      expect(service.create).toBeDefined();
      expect(service.findByEmail).toBeDefined();
      expect(service.update).toBeDefined();
      expect(service.getMe).toBeDefined();
      expect(service.findByFacebookId).toBeDefined();
      expect(service.createFacebookUser).toBeDefined();
    });
  });
});
