import type { SavedViewDto } from '@aionos/shared';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { CreateSavedViewDto } from './dto/saved-view.dto.js';
import { SavedViewsService } from './saved-views.service.js';

@ApiTags('saved-views')
@Controller('saved-views')
export class SavedViewsController {
  constructor(private readonly views: SavedViewsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<SavedViewDto[]> {
    return this.views.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateSavedViewDto): Promise<SavedViewDto> {
    return this.views.create(user, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.views.remove(user, id);
  }
}
