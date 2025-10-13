import { registerAs } from '@nestjs/config';

export default registerAs('facebookConfig', () => ({
  clientID: process.env.FACEBOOK_CLIENT_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: process.env.FACEBOOK_CALLBACK_URL,
  scope: ['email', 'public_profile'],
}));
