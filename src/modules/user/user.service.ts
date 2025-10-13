import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, DataSource } from 'typeorm';
import { OAuthProfileDto } from '@modules/auth/dto/oauth-profile.dto';

import { Provider } from '@modules/auth/entities/provider.entity';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private dataSource: DataSource,
  ) {}

  async create(profile: OAuthProfileDto): Promise<User> {
    return await this.dataSource.transaction(async (entityManager) => {
      const user = entityManager.create(User, profile);
      const savedUser = await entityManager.save(User, user);

      const userProvider = entityManager.create(Provider, {
        providerId: profile.providerId,
        name: profile.provider,
        user: savedUser,
      });
      await entityManager.save(Provider, userProvider);

      return savedUser;
    });
  }

  async findOneBy(
    where: FindOptionsWhere<User> | FindOptionsWhere<User>[],
  ): Promise<User | null> {
    return this.usersRepository.findOne({ where });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
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
}
