/* eslint-disable */
import { UsersController } from '../user.controller';
import { UserService } from '../user.service';

describe('UsersController', () => {
  let controller;
  let userService;

  beforeEach(() => {
    userService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      getMe: jest.fn(),
      findByFacebookId: jest.fn(),
      createFacebookUser: jest.fn(),
    };

    controller = new UsersController(userService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should have userService injected', () => {
    expect(controller['usersService']).toBeDefined();
    expect(controller['usersService']).toBe(userService);
  });

  describe('constructor', () => {
    it('should create controller with userService dependency', () => {
      const newController = new UsersController(userService);
      expect(newController).toBeInstanceOf(UsersController);
      expect(newController['usersService']).toBe(userService);
    });
  });
});
