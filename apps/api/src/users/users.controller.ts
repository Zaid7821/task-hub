import type { Paginated, UserDto } from '@aionos/shared';
import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profile of the signed-in user (also provisions them on first login)' })
  @ApiOkResponse({ description: 'UserDto (see packages/shared)' })
  me(@CurrentUser() user: AuthUser): Promise<UserDto> {
    return this.users.getMe(user);
  }

  @Get()
  @ApiOperation({ summary: 'Employee directory (paginated, sorted by name)' })
  list(@Query() query: UserQueryDto): Promise<Paginated<UserDto>> {
    return this.users.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string): Promise<UserDto> {
    return this.users.getById(id);
  }
}
