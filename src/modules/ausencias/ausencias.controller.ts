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
    const result = await this.ausenciasService.trabPorClaves(codigos,date, ueb);
    console.log(result);
    return res.status(HttpStatus.OK).json(result);
  }

/*   @Post('filtrar')
  filtrarTrabajadores(@Body() filtersDto: FiltersDto) {
    return this.ausenciasService.obtenerFiltros(filtersDto);
  } */
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
    return await this.ausenciasService.cantTrabajadoresInterruptos(ueb, fecha);
  }

  // Agregar endpoint de prueba
@Get('interruptos-test')
async testInterruptos() {
  // Retorna datos de prueba estructurados correctamente
  return {
    interruptos: [
      {
        Direccion: "Dirección de Prueba",
        covid: 5,
        reubicados: 3,
        produccion25: 10,
        produccion48: 2
      }
    ],
    totalReub: { Total: 3, F: 1, M: 2 },
    totalCovid: { Total: 5, F: 2, M: 3 },
    totalProd25: { Total: 10, F: 6, M: 4 },
    totalProd48: { Total: 2, F: 1, M: 1 },
    totales: {},
    totalesInt: null
  };
}


}
