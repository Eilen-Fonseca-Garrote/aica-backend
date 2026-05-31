import { ApiProperty } from '@nestjs/swagger';
import { IsHexColor, IsNotEmpty, IsString } from 'class-validator';

export class CreateSystemInterfaceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  logo: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  favicon: string;

  @ApiProperty()
  @IsString()
  @IsHexColor()
  primaryColor: string;

  @ApiProperty()
  @IsString()
  @IsHexColor()
  sidebarColor: string;
}
