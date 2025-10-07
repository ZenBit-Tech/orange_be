import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from 'typeorm';
import { LoginToken } from '@database/entities/login-token.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ unique: true })
    email: string;

    @OneToMany(() => LoginToken, (loginToken) => loginToken.user, { cascade: true })
    loginTokens: LoginToken[];
}