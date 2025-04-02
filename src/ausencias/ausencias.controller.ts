import { Controller, Get, Post, Query,Body,Res, HttpException, HttpStatus} from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { FiltersDto } from './dto/filters.dto';
import { Response } from 'express';

@Controller('ausencias')
export class AusenciasController {
  constructor(private readonly ausenciasService: AusenciasService) {}

  @Get('claves')
  async getClaves(@Query('ueb') ueb: string, @Query('fecha') fecha: string) {
    return this.ausenciasService.listAusentismoClaves(ueb, fecha);
  }

  @Post('filtrar')
  filtrarTrabajadores(@Body() filtersDto: FiltersDto) {
    return this.ausenciasService.obtenerFiltros(filtersDto);

}
  @Get('interruptos')
  async getTrabajadoresInterruptos(@Query('ueb') ueb: number, @Query('fecha') fecha: string) {
    if (!ueb || !fecha) {
      throw new HttpException('Los parámetros UEB y fecha son obligatorios.', HttpStatus.BAD_REQUEST);
    }

    const fechaRegex = /^(0[1-9]|1[0-2])-\d{4}$/; // Formato MM-YYYY
    if (!fechaRegex.test(fecha)) {
      throw new HttpException('Formato de fecha inválido.', HttpStatus.BAD_REQUEST);
    }
    return this.ausenciasService.cantTrabajadoresInterruptos(ueb, fecha);
  }

}

