import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { FiltersDto } from './dto/filters.dto';
import { Response } from 'express';
import { ClavesDto } from './dto/claves.dto';
import { ApiBody } from '@nestjs/swagger';

@Controller('ausencias')
export class AusenciasController {
  constructor(private readonly ausenciasService: AusenciasService) {}

  @Post('claves')
  @ApiBody({ type: ClavesDto })
  async getClaves(
    @Body() clavesDto: ClavesDto,
    @Res() res: Response,
  ) {
    const { codigos, date, ueb } = clavesDto;
    if (!ueb || !date) {
      throw new HttpException(
        'Los parámetros UEB y fecha son obligatorios.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fechaRegex = /^(0[1-9]|1[0-2])-\d{4}$/; // Formato MM-YYYY
    if (!fechaRegex.test(date)) {
      throw new HttpException(
        'Formato de fecha inválido.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.ausenciasService.trabPorClaves(codigos,date, ueb);
  }

  @Post('filtrar')
  filtrarTrabajadores(@Body() filtersDto: FiltersDto) {
    return this.ausenciasService.obtenerFiltros(filtersDto);
  }
  @Get('interruptos')
  async getTrabajadoresInterruptos(
    @Query('ueb') ueb: number,
    @Query('fecha') fecha: string,
  ) {
    if (!ueb || !fecha) {
      throw new HttpException(
        'Los parámetros UEB y fecha son obligatorios.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const fechaRegex = /^(0[1-9]|1[0-2])-\d{4}$/; // Formato MM-YYYY
    if (!fechaRegex.test(fecha)) {
      throw new HttpException(
        'Formato de fecha inválido.',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.ausenciasService.cantTrabajadoresInterruptos(ueb, fecha);
  }
}
