import { IsArray, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClavesDto {
  @ApiProperty({
    description: 'Lista de códigos',
    example: ['clave1', 'clave2'],
  })
  @IsArray()
  @IsNotEmpty()
  codigos: string[];

  @ApiProperty({
    description: 'Fecha en formato MM-YYYY',
    example: '03-2025',
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    description: 'Código de la UEB',
    example: '16',
  })
  @IsString()
  @IsNotEmpty()
  ueb: string;
}