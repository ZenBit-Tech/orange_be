import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Example } from './entities/example.entity';
import { CreateExampleDto } from './dto/create-example.dto';

@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private readonly exampleRepo: Repository<Example>,
  ) {}

  async create(dto: CreateExampleDto): Promise<Example> {
    const example = this.exampleRepo.create(dto);
    return this.exampleRepo.save(example);
  }

  async findAll(): Promise<Example[]> {
    return this.exampleRepo.find();
  }
}
