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
import { PromedioPdfUtil } from './utils/pdf.utils';
import { PromedioReport } from './utils/pdf.utils';
import { PromedioGeneralReport } from './utils/pdf.utils';

@ApiTags('calcularPromedio')
@Controller('calcularPromedio')
export class CalcularPromedioController {
   constructor(private readonly promedioService: CalcularPromedioService) {}
 
   @Get('promedioMensual')
   async getPromedioMensual(
     @Query('ueb') ueb: string,
     @Query('fecha') fecha: string
   ) {
     return this.promedioService.getPromedioMensual(ueb, fecha);
   }

   @Get('promedioMensualPdf')
  async exportPdf(
    @Query('ueb') ueb: string,
    @Query('fecha') fecha: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.promedioService.getPromedioMensual(ueb, fecha);
      
      if (!data) {
        return res.status(404).send('Datos no encontrados');
      }

      await PromedioPdfUtil.exportPromedioMensualPdf(data as PromedioReport | PromedioGeneralReport, res);
    } catch (error) {
      console.error('Error generando PDF:', error);
      return res.status(500).send('Error al generar el reporte');
    }
  }

  @Get('promedioDiarioRango')
  async getPromedioRango(
    @Query('ueb') ueb: string,
    @Query('fecha') fecha: string,
    @Query('direccion') direccion: string
  ) {
    const data = await this.promedioService.getPromedioRango(ueb, direccion, fecha);
    
    return {
      success: true,
      promedio: data.promedio,
      total: data.total[0], 
      fecha: data.fecha,
      ueb: data.ueb,
      direcc: data.direcc
    };
  }

  @Get('promedioDiarioRango/pdf')
  async exportRangoPdf(
    @Query('ueb') ueb: string,
    @Query('direccion') direccion: string,
    @Query('fecha') fecha: string,
    @Res() res: Response
  ) {
    try {
      const data = await this.promedioService.getPromedioRango(ueb, direccion, fecha);
      await PromedioPdfUtil.exportPromedioDiarioPdf(data, res);
    } catch (error) {
      return res.status(500).json({
        message: 'Error generating PDF',
        error: error.message
      });
    }
  }

}
