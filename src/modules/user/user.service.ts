import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleUserDto } from '@database/dtos/google-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async createGoogleUser(profile: GoogleUserDto): Promise<User> {
    const newUser = this.usersRepository.create({
      googleId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
    });

    return this.usersRepository.save(newUser);
  }
}
