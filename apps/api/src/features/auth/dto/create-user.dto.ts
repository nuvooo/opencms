import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString({
    message: 'Password must be a string',
  })
  password: string;

  @ApiProperty({ required: false, enum: ['ADMIN', 'USER'] })
  @IsOptional()
  @IsIn(['ADMIN', 'USER'])
  role?: 'ADMIN' | 'USER';
}
