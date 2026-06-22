import { ApiProperty } from '@nestjs/swagger';

export class ApiTokenResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  lastChars: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  expiresAt?: Date;

  @ApiProperty({ nullable: true })
  token?: string;
}
