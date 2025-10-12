import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as OpenIDConnectStrategy } from 'passport-openidconnect';
import { ConfigService } from '@nestjs/config';
import {
  AUTHORIZATION_URL,
  ISSUER,
  TOKEN_URL,
  USER_INFO_URL,
} from '@common/constants';

interface LinkedInProfile {
  id: string;
  emails?: { value: string }[];
  displayName?: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
}

interface LinkedInUser {
  id: string;
  fullName: string;
  email?: string;
}

type VerifyCallback = (
  error: Error | null,
  user?: LinkedInUser | false,
) => void;

@Injectable()
export class LinkedInStrategy extends PassportStrategy(
  OpenIDConnectStrategy,
  'linkedin',
) {
  constructor(private configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      issuer: ISSUER,
      authorizationURL: AUTHORIZATION_URL,
      tokenURL: TOKEN_URL,
      userInfoURL: USER_INFO_URL,
      clientID: configService.getOrThrow<string>('linkedinAuth.clientId'),
      clientSecret: configService.getOrThrow<string>(
        'linkedinAuth.clientSecret',
      ),
      callbackURL: configService.getOrThrow<string>('linkedinAuth.callbackURL'),
      scope: configService.getOrThrow<string[]>('linkedinAuth.scope'),
      state: true,
    });
  }

  validate(
    issuer: string,
    profile: LinkedInProfile,
    callback: VerifyCallback,
  ): void {
    try {
      const id = String(profile.id);
      const email = profile.emails?.[0]?.value;
      const givenName = profile.name?.givenName ?? '';
      const familyName = profile.name?.familyName ?? '';
      const fullName = `${givenName} ${familyName}`.trim();

      const user: LinkedInUser = {
        id,
        fullName,
        email,
      };

      if (!user.id) {
        return callback(new Error('Missing LinkedIn user ID'));
      }

      callback(null, user);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Unknown error during validation');
      callback(error);
    }
  }
}
