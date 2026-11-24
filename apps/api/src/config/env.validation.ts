import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

const toBoolean = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() === 'true' : value;

const toList = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : value;

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @Matches(/^postgres(ql)?:\/\//, {
    message: 'DATABASE_URL must be a PostgreSQL connection string',
  })
  DATABASE_URL: string;

  @Transform(toList)
  @IsArray()
  @ArrayNotEmpty()
  @IsUrl({ require_tld: false, require_protocol: true }, { each: true })
  CORS_ORIGINS: string[];

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED: boolean = true;

  @IsUUID('all')
  ENTRA_TENANT_ID: string;

  @IsUUID('all')
  ENTRA_API_CLIENT_ID: string;

  @IsString()
  @IsNotEmpty()
  ENTRA_API_AUDIENCE: string;

  /** Login host; override only for sovereign clouds (e.g. https://login.microsoftonline.us). */
  @IsUrl({ require_tld: false, require_protocol: true })
  ENTRA_AUTHORITY_HOST: string = 'https://login.microsoftonline.com';

  /** Master switch for the Microsoft Graph directory sync (scheduled and "Sync now"). */
  @Transform(toBoolean)
  @IsBoolean()
  GRAPH_SYNC_ENABLED: boolean = false;

  /** Client secret of the API app registration (app-only Graph token, User.Read.All). */
  @IsString()
  GRAPH_CLIENT_SECRET: string = '';

  /** Graph endpoint; override only for sovereign clouds (e.g. https://graph.microsoft.us/v1.0). */
  @IsUrl({ require_tld: false, require_protocol: true })
  GRAPH_API_BASE_URL: string = 'https://graph.microsoft.com/v1.0';

  /** Hours between scheduled syncs; 0 = only when an admin presses "Sync now". */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(168)
  GRAPH_SYNC_INTERVAL_HOURS: number = 24;

  /** Local-only: authenticate via the X-Dev-User-Email header instead of an Entra token. */
  @Transform(toBoolean)
  @IsBoolean()
  AUTH_DEV_BYPASS: boolean = false;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors
      .map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  if (validated.AUTH_DEV_BYPASS && validated.NODE_ENV === NodeEnv.Production) {
    throw new Error('AUTH_DEV_BYPASS must never be enabled when NODE_ENV=production');
  }
  if (validated.GRAPH_SYNC_ENABLED && validated.GRAPH_CLIENT_SECRET.trim() === '') {
    throw new Error('GRAPH_CLIENT_SECRET is required when GRAPH_SYNC_ENABLED=true');
  }
  return validated;
}
