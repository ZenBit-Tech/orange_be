import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { ExampleService } from './example.service';
import { CreateExampleDto } from './dto/create-example.dto';
import { ExampleResponseDto } from './dto/response-example.dto';

@ApiTags('Example api')
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @ApiResponse({ status: 201, description: 'Example created.' })
  async create(@Body() dto: CreateExampleDto): Promise<ExampleResponseDto> {
    const example = await this.exampleService.create(dto);
    return this.toDto(example);
  }

  @Get()
  @ApiResponse({ status: 200, description: 'Get all examples.' })
  async findAll(): Promise<ExampleResponseDto[]> {
    const examples = await this.exampleService.findAll();
    return examples.map((e) => this.toDto(e));
  }

  private toDto(example: any): ExampleResponseDto {
    return {
      id: example._id.toString(),
      name: example.name,
      description: example.description,
    };
  }
}
