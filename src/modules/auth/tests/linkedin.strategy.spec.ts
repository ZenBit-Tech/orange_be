/* eslint-disable */
jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (strategy) => {
    return class {
      constructor() {}
    };
  },
}));

jest.mock('passport-openidconnect', () => ({
  Strategy: class {},
}));

import { LinkedInStrategy } from '../strategies/linkedin.strategy';
import { ConfigService } from '@nestjs/config';

describe('LinkedInStrategy', () => {
  let strategy;
  let configService;

  beforeEach(() => {
    configService = {
      getOrThrow: jest.fn((key) => {
        const config = {
          'linkedinAuth.clientId': 'test-client-id',
          'linkedinAuth.clientSecret': 'test-secret',
          'linkedinAuth.callbackURL': 'http://localhost/callback',
          'linkedinAuth.scope': ['openid', 'profile', 'email'],
        };
        return config[key];
      }),
    };

    strategy = new LinkedInStrategy(configService);
  });

  describe('validate', () => {
    it('should validate and return user with complete profile', () => {
      const profile = {
        id: 'linkedin-123',
        emails: [{ value: 'test@linkedin.com' }],
        displayName: 'Test User',
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: 'test@linkedin.com',
        fullName: 'Test User',
      });
    });

    it('should handle missing email', () => {
      const profile = {
        id: 'linkedin-123',
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: undefined,
        fullName: 'Test User',
      });
    });

    it('should handle missing name parts', () => {
      const profile = {
        id: 'linkedin-123',
        emails: [{ value: 'test@linkedin.com' }],
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: 'test@linkedin.com',
        fullName: '',
      });
    });

    it('should handle only given name', () => {
      const profile = {
        id: 'linkedin-123',
        emails: [{ value: 'test@linkedin.com' }],
        name: {
          givenName: 'Test',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: 'test@linkedin.com',
        fullName: 'Test',
      });
    });

    it('should handle only family name', () => {
      const profile = {
        id: 'linkedin-123',
        emails: [{ value: 'test@linkedin.com' }],
        name: {
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: 'test@linkedin.com',
        fullName: 'User',
      });
    });

    it('should handle numeric id', () => {
      const profile = {
        id: 12345,
        emails: [{ value: 'test@linkedin.com' }],
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: '12345',
        email: 'test@linkedin.com',
        fullName: 'Test User',
      });
    });

    it('should handle empty string id', () => {
      const profile = {
        id: '',
        emails: [{ value: 'test@linkedin.com' }],
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing LinkedIn user ID',
        }),
      );
    });

    it('should handle errors during validation', () => {
      const profile = {
        get id() {
          throw new Error('Test error');
        },
      };
      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(
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
      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error during validation',
        }),
      );
    });

    it('should handle empty emails array', () => {
      const profile = {
        id: 'linkedin-123',
        emails: [],
        name: {
          givenName: 'Test',
          familyName: 'User',
        },
      };

      const callback = jest.fn();

      strategy.validate('issuer', profile, callback);

      expect(callback).toHaveBeenCalledWith(null, {
        id: 'linkedin-123',
        email: undefined,
        fullName: 'Test User',
      });
    });
  });
});
