import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleUserDto } from '@database/dtos/google-user.dto';
import { User } from './entities/user.entity';
import { LinkedinUserDto } from '@database/dtos/linkedin-user.dto';
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

  async getMe(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: {
        id: userId,
      },
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async findByLinkedInId(linkedinId: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { linkedinId },
    });
  }

  async createLinkedInUser(profile: LinkedinUserDto): Promise<User> {
    const user = this.usersRepository.create({
      linkedinId: profile.id,
      email: profile.email,
      fullName: profile.fullName,
    });
    return this.usersRepository.save(user);
  }
}
