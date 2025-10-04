import { User } from '@modules/user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: () => User })
  user: User;
}
