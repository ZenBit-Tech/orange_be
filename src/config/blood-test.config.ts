import { registerAs } from '@nestjs/config';

export default registerAs('BloodTestConfig', () => ({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
}));
