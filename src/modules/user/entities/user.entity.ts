import { Provider } from '@modules/auth/entities/provider.entity';
import { ApiProperty } from '@nestjs/swagger';

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
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

  @ApiProperty({ description: 'Email of user' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'First Name of user' })
  @Column({ nullable: true })
  first_name: string;

  @ApiProperty({ description: 'Last Name of user' })
  @Column({ nullable: true })
  last_name: string;

  @OneToMany(() => Provider, (provider) => provider.user)
  providers: Provider[];

  @ApiProperty({ description: 'Create date of user' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Update date of user' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
