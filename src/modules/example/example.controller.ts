import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Example api')
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Example created.' })
  create(@Body() dto: CreateExampleDto) {
    return this.exampleService.create(dto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Get all examples.' })
  findAll() {
    return this.exampleService.findAll();
  }
}
