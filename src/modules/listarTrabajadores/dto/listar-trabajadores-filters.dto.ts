import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class ListarTrabajadoresFiltersDto {
  @IsString()
  uebSelect: string;

  @IsOptional()
  @IsString()
  direccionFSelect?: string;

  @IsOptional()
  @IsString()
  areaSelect?: string;

  @IsOptional()
  @IsString()
  municipioSelect?: string;

  @IsOptional()
  @IsString()
  reparto?: string;

  @IsOptional()
  @IsString()
  sexoSelect?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  edad?: number;

  @IsOptional()
  @IsIn(['<', '>', '='])
  edadOperator?: '<' | '>' | '=';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hijos?: number;

  @IsOptional()
  @IsString()
  grupoFactor?: string;

  @IsOptional()
  @IsString()
  nescolar?: string;

  @IsOptional()
  @IsString()
  raza?: string;

  @IsOptional()
  @IsString()
  carrera?: string;

  @IsOptional()
  @IsString()
  camisa?: string;

  @IsOptional()
  @IsString()
  pantalon?: string;

  @IsOptional()
  @IsString()
  zapato?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  pcc?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  ujc?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  imprescindible?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  licConduc?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  auto?: boolean;

  @IsOptional()
  @IsString()
  master?: string;

  @IsOptional()
  @IsString()
  fechagrad?: string;

  @IsOptional()
  @IsIn(['<', '>'])
  fechaGradOperator?: '<' | '>';

  @IsOptional()
  @IsString()
  fechaalta?: string;

  @IsOptional()
  @IsIn(['<', '>'])
  fechaAltaOperator?: '<' | '>';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  experiencia?: number;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  ubicDef?: string;

  @IsOptional()
  @IsString()
  cat_cient?: string;

  @IsOptional()
  @IsString()
  sub_cat_cient?: string;
}
