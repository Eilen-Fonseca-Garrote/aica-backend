import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Header,
    StreamableFile,
    HttpException,
    HttpStatus,
    Query,
    Res,
  } from '@nestjs/common';
import { CalcularPromedioService } from './calcularPromedio.service';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Readable } from 'stream';

@ApiTags('calcularPromedio')
@Controller('calcularPromedio')

export class CalcularPromedioController {
   constructor(private readonly calcularPromedioService: CalcularPromedioService) {}
 
   //Calcular promedio mensual
  @Get('mensual') //que se pone aqui?
  async getPromedioMensual(
    @Query('ueb') ueb: string, 
    @Query('fecha') fecha: string) {
    return this.calcularPromedioService.getPromedioMensual(ueb, fecha);
  }

  //Expportar promedio mensual
  @Get('mensual/pdf')
  async getPromedioMensualPDF(
    @Query('ueb') ueb: string, 
    @Query('fecha') fecha: string, 
 ) {
    return this.promedioService.getPromedioMensualPDF(ueb, fecha, res);
  }
//Calcular promedio diario
  @Get('rango/ajax')
  async getPromedioRangoAjax(
    @Query('ueb') ueb: string,
    @Query('direccion') direccion: string,
    @Query('fecha') fecha: string
  ) {
    return this.promedioService.getPromedioRangoAjax(ueb, direccion, fecha);
  }
//Exportar promedio diario
  @Get('rango/pdf')
  async getPromedioRangoPDF(
    @Query('ueb') ueb: string,
    @Query('direccion') direccion: string,
    @Query('fecha') fecha: string,
    @Res() res: Response
  ) {
    return this.promedioService.getPromedioRangoPDF(ueb, direccion, fecha, res);
  }


}
