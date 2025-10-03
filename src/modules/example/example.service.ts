// example.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Example } from './example.schema';

@Injectable()
export class ExampleService {
  constructor(@InjectModel(Example.name) private exampleModel: Model<Example>) {}

  async create(data: Partial<Example>) {
    const doc = new this.exampleModel(data);
    return doc.save();
  }

  async findAll() {
    return this.exampleModel.find().exec();
  }

  async findOne(id: string) {
    return this.exampleModel.findById(id).exec();
  }
}
