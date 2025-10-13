import { Module } from '@nestjs/common';
import { AuthModule } from '@modules/auth/auth.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
