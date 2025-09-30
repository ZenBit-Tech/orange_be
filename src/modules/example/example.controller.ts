import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ExampleResponseDto } from './dto/response-example.dto';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('Example api')
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Example created.' })
  create(@Body() dto: CreateExampleDto): Promise<ExampleResponseDto>  {
    return this.exampleService.create(dto);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Get all examples.' })
  findAll(): Promise<ExampleResponseDto[]> {
    return this.exampleService.findAll();
  }
}
