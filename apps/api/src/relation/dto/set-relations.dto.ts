import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsUUID } from 'class-validator';

export class SetRelationsDto {
  @ApiProperty()
  @IsString()
  fieldName: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  relatedEntryIds: string[];
}
