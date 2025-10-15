import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsNumber()
  @IsNotEmpty()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @IsNumber()
  @IsNotEmpty()
  DB_PORT: number;

  @IsString()
  @IsNotEmpty()
  DB_USER: string;

  @IsString()
  @IsNotEmpty()
  DB_PASS: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNotEmpty()
  @IsNumber()
  JWT_ACCESS_TOKEN_TTL: number;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CLIENT_ID: string;
  @IsString()
  @IsNotEmpty()
  GOOGLE_SECRET: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_CALLBACK_URL: string;

  @IsString()
  @IsNotEmpty()
  LINKEDIN_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  LINKEDIN_CLIENT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  LINKEDIN_CALLBACK_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  let errorMessage = errors
    .filter((err) => err.constraints)
    .map((err) => {
      const firstKey = Object.keys(err.constraints!)[0];
      return err.constraints![firstKey];
    })
    .join('\n');

  const COLOR = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    fgRed: '\x1b[31m',
  };

  errorMessage = `${COLOR.fgRed}${COLOR.bright}${errorMessage}${COLOR.reset}`;

  if (errors.length > 0) {
    throw new Error(errorMessage);
  }

  return validatedConfig;
}
