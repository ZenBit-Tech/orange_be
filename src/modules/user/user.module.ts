import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UsersController } from './user.controller';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
  providers: [UserService],
  exports: [UserService, TypeOrmModule],
  controllers: [UsersController],
})
export class UserModule {}
