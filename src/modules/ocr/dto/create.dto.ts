import { IsNotEmpty } from 'class-validator';

export class CreateOcrDto {
  @IsNotEmpty()
  data: string;
}
