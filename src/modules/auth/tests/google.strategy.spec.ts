/* eslint-disable */
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (strategy) => {
    return class {
      constructor() {}
    };
  },
}));

jest.mock('passport-google-oauth20', () => ({
  Strategy: class {},
}));

import { GoogleStrategy } from '../strategies/google-strategy';
import { ConfigService } from '@nestjs/config';

describe('GoogleStrategy', () => {
  let strategy;
  let configService;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key) => {
        const config = {
          'googleAuth.clientID': 'test-client-id',
          'googleAuth.clientSecret': 'test-secret',
          'googleAuth.callbackURL': 'http://localhost/callback',
          'googleAuth.scope': ['email', 'profile'],
        };
        return config[key];
      }),
    };

    strategy = new GoogleStrategy(configService);
  });

  describe('validate', () => {
    it('should validate and return user with complete profile', () => {
      const profile = {
        id: 'google-123',
        emails: [{ value: 'test@gmail.com' }],
        displayName: 'Test User',
        photos: [{ value: 'photo-url' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: 'google-123',
        email: 'test@gmail.com',
        fullName: 'Test User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should handle missing email', () => {
      const profile = {
        id: 'google-123',
        displayName: 'Test User',
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: 'google-123',
        email: undefined,
        fullName: 'Test User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should handle missing display name', () => {
      const profile = {
        id: 'google-123',
        emails: [{ value: 'test@gmail.com' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: 'google-123',
        email: 'test@gmail.com',
        fullName: undefined,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should handle missing profile id', () => {
      const profile = {
        emails: [{ value: 'test@gmail.com' }],
        displayName: 'Test User',
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Google profile ID is missing',
        }),
      );
    });

    it('should handle empty emails array', () => {
      const profile = {
        id: 'google-123',
        emails: [],
        displayName: 'Test User',
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: 'google-123',
        email: undefined,
        fullName: 'Test User',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('should handle errors during validation', () => {
      const profile = {
        get id() {
          throw new Error('Test error');
        },
      };
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error',
        }),
      );
    });

    it('should wrap non-Error exceptions', () => {
      const profile = {
        get id() {
          throw 'string error';
        },
      };
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'string error',
        }),
      );
    });
  });
});
