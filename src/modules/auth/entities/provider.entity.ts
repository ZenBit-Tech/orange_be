import { ApiProperty } from '@nestjs/swagger';
import { User } from '@modules/user/entities/user.entity';
import { ProviderEnum } from '@common/enums/providers.enums';

import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'providers',
})
export class Provider {
  @ApiProperty({
    description: 'ID of provider',
    example: '89c018cc-8a77-4dbd-94e1-dbaa710a2a9c',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Name of the provider',
    example: 'facebook',
  })
  @Column({ unique: true, nullable: false, enum: ProviderEnum, type: 'enum' })
  name: ProviderEnum;

  @ApiProperty({
    description: 'Id from provider like google of our user.',
  })
  @Column({ nullable: false, name: 'provider_id' })
  providerId: string;

  @ApiProperty({ description: 'Create date of provider' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date of provider' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.providers)
  user: User;
}
