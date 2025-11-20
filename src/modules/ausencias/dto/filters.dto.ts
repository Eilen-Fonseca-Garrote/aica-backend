import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class FiltersDto {
  @IsOptional()
  @IsString()
  direccionFSelect?: string;

  @IsOptional()
  @IsString()
  uebSelect?: string;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsString()
  sexoSelect?: string;

  @IsOptional()
  @IsNumber()
  edad?: number;

  @IsOptional()
  @IsString()
  edadOperator?: string;

  @IsOptional()
  @IsString()
  carrera?: string;

  @IsOptional()
  @IsString()
  municipioSelect?: string;

  @IsOptional()
  @IsString()
  grupoFactor?: string;

  @IsOptional()
  @IsNumber()
  hijos?: number;

  @IsOptional()
  @IsBoolean()
  pcc?: boolean;

  @IsOptional()
  @IsBoolean()
  ujc?: boolean;

  @IsOptional()
  @IsString()
  nivelEscolar?: string;

  @IsOptional()
  @IsString()
  raza?: string;

  @IsOptional()
  @IsString()
  tallaZapato?: string;

  @IsOptional()
  @IsString()
  tallaPantalon?: string;

  @IsOptional()
  @IsString()
  tallaCamisa?: string;

  @IsOptional()
  @IsString()
  experiencia?: string;

  @IsOptional()
  @IsString()
  fechaAlta?: string;

  @IsOptional()
  @IsString()
  fechaGraduacion?: string;

  @IsOptional()
  @IsBoolean()
  imprescindible?: boolean;

  @IsOptional()
  @IsBoolean()
  licenciaConducir?: boolean;

  @IsOptional()
  @IsBoolean()
  auto?: boolean;
}
