import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  StrategyOptions,
  VerifyCallback,
  Profile,
} from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { GoogleUserDto } from '@database/dtos/google-user.dto';

interface GoogleProfile {
  id: string;
  emails?: { value: string }[];
  displayName?: string;
  photos?: { value: string }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super({
      clientID: configService.getOrThrow<string>('googleAuth.clientID'),
      clientSecret: configService.getOrThrow<string>('googleAuth.clientSecret'),
      callbackURL: configService.getOrThrow<string>('googleAuth.callbackURL'),
      scope: configService.getOrThrow<string[]>('googleAuth.scope'),
    } as StrategyOptions);
  }

  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    try {
      const typedProfile = profile as GoogleProfile;
      if (!typedProfile.id) {
        (done as (err: Error | null, user?: Express.User | false) => void)(
          new Error('Google profile ID is missing'),
        );
        return;
      }
      const user: GoogleUserDto & {
        accessToken: string;
        refreshToken: string;
      } = {
        id: typedProfile.id,
        email: typedProfile.emails?.[0]?.value,
        fullName: typedProfile.displayName,
        accessToken,
        refreshToken,
      };

      (done as (err: Error | null, user?: Express.User | false) => void)(
        null,
        user,
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      (done as (err: Error | null, user?: Express.User | false) => void)(error);
    }
  }
}
