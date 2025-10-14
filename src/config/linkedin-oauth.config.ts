import { registerAs } from '@nestjs/config';

export default registerAs('linkedinAuth', () => ({
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: process.env.LINKEDIN_CALLBACK_URL,
  scope: ['openid', 'profile', 'email'],
}));
