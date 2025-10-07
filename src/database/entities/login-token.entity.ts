import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index } from 'typeorm';
import { User } from '@database/entities/user.entity';

@Entity('login_tokens')
export class LoginToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column()
    token: string;

    @Column()
    expiry: Date;

    @ManyToOne(() => User, (user) => user.loginTokens, { onDelete: 'CASCADE' })
    user: User;
}