import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Example } from './entities/example.entity';
import { ExampleService } from './example.service';
import { ExampleController } from './example.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Example])],
  controllers: [ExampleController],
  providers: [ExampleService],
  exports: [ExampleService],
})
export class ExampleModule {}
