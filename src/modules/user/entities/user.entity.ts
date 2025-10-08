import { ApiProperty } from '@nestjs/swagger';

import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({
  name: 'users',
})
export class User {
  @ApiProperty({
    description: 'ID of user',
    example: '89c018cc-8a77-4dbd-94e1-dbaa710a2a9c',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'UserId from Google' })
  @Column({ unique: true, nullable: true })
  googleId: string;

  @ApiProperty({ description: 'Email of user' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'Full Name of user' })
  @Column({ nullable: true })
  fullName: string;

  @ApiProperty({ description: 'Create date of user' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date of user' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
