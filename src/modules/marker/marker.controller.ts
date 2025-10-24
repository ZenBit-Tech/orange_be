import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MarkerService } from './marker.service';
import { CreateMarkerDto, UpdateMarkerDto } from './dto/marker.dto';
import { Marker } from './entities/marker.entity';

@ApiTags('Markers')
@Controller('markers')
export class MarkerController {
  constructor(private readonly markerService: MarkerService) {}

  @ApiOperation({ summary: 'Create a new marker' })
  @ApiResponse({ status: 201, description: 'Marker created successfully' })
  @Post()
  async create(@Body() createMarkerDto: CreateMarkerDto): Promise<Marker> {
    return this.markerService.create(createMarkerDto);
  }

  @ApiOperation({ summary: 'Bulk create markers' })
  @ApiResponse({ status: 201, description: 'Markers created successfully' })
  @Post('bulk')
  async bulkCreate(@Body() markers: CreateMarkerDto[]): Promise<Marker[]> {
    return this.markerService.bulkCreate(markers);
  }

  @ApiOperation({ summary: 'Get all markers' })
  @ApiResponse({
    status: 200,
    description: 'Return all markers',
    type: [Marker],
  })
  @Get()
  async findAll(): Promise<Marker[]> {
    return this.markerService.findAll();
  }

  @ApiOperation({ summary: 'Get markers by language' })
  @ApiResponse({ status: 200, description: 'Return markers for language' })
  @ApiQuery({ name: 'language', required: true, example: 'en' })
  @Get('language/:language')
  async findByLanguage(@Param('language') language: string): Promise<Marker[]> {
    return this.markerService.findByLanguage(language);
  }

  @ApiOperation({ summary: 'Get markers by language and category' })
  @ApiResponse({ status: 200, description: 'Return filtered markers' })
  @Get('language/:language/category/:category')
  async findByLanguageAndCategory(
    @Param('language') language: string,
    @Param('category') category: string,
  ): Promise<Marker[]> {
    return this.markerService.findByLanguageAndCategory(language, category);
  }

  @ApiOperation({ summary: 'Get marker by ID' })
  @ApiResponse({ status: 200, description: 'Return marker' })
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Marker> {
    return this.markerService.findOne(id);
  }

  @ApiOperation({ summary: 'Update marker' })
  @ApiResponse({ status: 200, description: 'Marker updated successfully' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMarkerDto: UpdateMarkerDto,
  ): Promise<Marker> {
    return this.markerService.update(id, updateMarkerDto);
  }

  @ApiOperation({ summary: 'Delete marker' })
  @ApiResponse({ status: 200, description: 'Marker deleted successfully' })
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.markerService.remove(id);
  }
}
