import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('examples')
export class Example {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
