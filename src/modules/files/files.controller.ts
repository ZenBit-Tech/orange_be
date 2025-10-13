import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateFileDto } from './dto/create.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor() {}

  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiOkResponse({ description: 'Data from client' })
  @ApiBearerAuth()
  @Post()
  create(@Body() createFileDto: CreateFileDto) {
    return createFileDto;
  }
}
