/* eslint-disable */
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (strategy) => {
    return class {
      constructor() {}
    };
  },
}));

jest.mock('passport-facebook', () => ({
  Strategy: class {},
}));

import { FacebookStrategy } from '../strategies/facebook.strategy';
import { ConfigService } from '@nestjs/config';

describe('FacebookStrategy', () => {
  let strategy;
  let configService;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key) => {
        const config = {
          FACEBOOK_CLIENT_ID: 'test-client-id',
          FACEBOOK_SECRET: 'test-secret',
          FACEBOOK_CALLBACK_URL: 'http://localhost/callback',
          'facebookConfig.scope': 'email,public_profile',
          'facebookConfig.profileFields': ['id', 'emails', 'name'],
        };
        return config[key];
      }),
    };

    strategy = new FacebookStrategy(configService);
  });

  describe('validate', () => {
    it('should validate and return user with complete profile', () => {
      const profile = {
        id: '123456',
        name: {
          givenName: 'John',
          familyName: 'Doe',
        },
        emails: [{ value: 'john@example.com' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: 'john@example.com',
        fullName: 'John Doe',
      });
    });

    it('should handle missing email by generating facebook email', () => {
      const profile = {
        id: '123456',
        name: {
          givenName: 'John',
          familyName: 'Doe',
        },
        emails: null,
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: '123456@facebook.com',
        fullName: 'John Doe',
      });
    });

    it('should handle empty emails array', () => {
      const profile = {
        id: '123456',
        name: {
          givenName: 'John',
          familyName: 'Doe',
        },
        emails: [],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: '123456@facebook.com',
        fullName: 'John Doe',
      });
    });

    it('should handle missing name parts', () => {
      const profile = {
        id: '123456',
        name: {},
        emails: [{ value: 'john@example.com' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: 'john@example.com',
        fullName: '',
      });
    });

    it('should handle only given name', () => {
      const profile = {
        id: '123456',
        name: {
          givenName: 'John',
        },
        emails: [{ value: 'john@example.com' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: 'john@example.com',
        fullName: 'John',
      });
    });

    it('should handle only family name', () => {
      const profile = {
        id: '123456',
        name: {
          familyName: 'Doe',
        },
        emails: [{ value: 'john@example.com' }],
      };

      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(null, {
        id: '123456',
        email: 'john@example.com',
        fullName: 'Doe',
      });
    });

    it('should handle errors during validation', () => {
      const profile = null;
      const done = jest.fn();

      strategy.validate('access-token', 'refresh-token', profile, done);

      expect(done).toHaveBeenCalledWith(expect.any(Error), null, null);
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
          message: 'Unknown error during validation',
        }),
        null,
        null,
      );
    });
  });
});
