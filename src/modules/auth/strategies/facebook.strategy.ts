import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ProviderEnum } from '@common/enums/providers.enums';
import { OAuthProfileDto } from '../dto/oauth-profile.dto';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(cs: ConfigService) {
    super({
      clientID: cs.getOrThrow<string>('FACEBOOK_CLIENT_ID'),
      clientSecret: cs.getOrThrow<string>('FACEBOOK_SECRET'),
      callbackURL: cs.getOrThrow<string>('FACEBOOK_CALLBACK_URL'),
      scope: 'email',
      profileFields: ['id', 'emails', 'name'],
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
    const { name, emails, id } = profile;

    const userEmail = emails && emails.length > 0 ? emails[0].value : null;
    const firstName = name?.givenName || '';
    const lastName = name?.familyName || '';

    if (!userEmail) {
      return done(new Error('No email found in Facebook profile'), null);
    }
    const payload: OAuthProfileDto = {
      provider: ProviderEnum.Facebook,
      providerId: id,
      email: userEmail,
      first_name: `${firstName}`.trim(),
      last_name: `${lastName}`.trim(),
    };
    done(null, payload);
  }
}
