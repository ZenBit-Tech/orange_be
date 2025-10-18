import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { FacebookUserDto } from '@database/dtos/facebook-user.dto';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(cs: ConfigService) {
    super({
      clientID: cs.getOrThrow<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: cs.getOrThrow<string>('FACEBOOK_SECRET'),
      callbackURL: cs.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      scope: cs.getOrThrow<string>('facebookConfig.scope'),
      profileFields: cs.getOrThrow<string[]>('facebookConfig.profileFields'),
      enableProof: true,
    });
  }
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (
      err: Error | null,
      user: Express.User | null,
      info?: string | null,
    ) => void,
  ): void {
    try {
      const { name, id, emails } = profile;

      const fullName = `${name?.givenName} ${name?.familyName}`.trim();

      const user: FacebookUserDto = {
        id: id,
        email: emails && emails[0] ? emails[0].value : `${id}@facebook.com`,
        fullName: fullName,
      };
      done(null, user);
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error('Unknown error during validation');
      done(error, null, null);
    }
  }
}
