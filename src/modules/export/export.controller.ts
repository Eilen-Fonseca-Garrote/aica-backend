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
import { ExportService } from './export.service';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import { Response } from 'express';
import { ClavesDto } from '../ausencias/dto/claves.dto';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Header(
    'content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename=trabajadores(${new Date().toISOString().split('T')[0]}).xlsx`,
  )
  @Get('reports/excel/all-workers')
  async exportAll() {
    try {
      const buffer = await this.exportService.generateAllWorkersExcel();
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null); // Indica el final del stream
      return new StreamableFile(readableStream);
    } catch (error) {
      throw new HttpException(
        'Error al generar el reporte: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename=modelo14B(${new Date().getMonth() + 1}-${new Date().getFullYear()}).xlsx`,
  )
  @Get('reports/excel/model14b')
  async exportModel14B() {
    try {
      const buffer = await this.exportService.exportModel14B();
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);
      return new StreamableFile(stream);
    } catch (error) {
      throw new HttpException(
        'Error al generar el reporte: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  
  @Get('reports/excel/ausentismo')
  async exportModelAusentismo(
    @Query('noLabDays') noLabDays: string,
    @Query('fechaAusentismo') fechaAusentismo: string,
    @Res({ passthrough: true }) res: Response, // Inyectar el objeto Response
  ) {
    try {
      const [mes, year] = fechaAusentismo.split('-');  // separar con - para fecha 
      const buffer = await this.exportService.generateAusentismoExcel(
        mes,
        parseInt(year),
        parseInt(noLabDays),
      );

      // Configurar los headers usando el objeto Response
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=modeloRL4(${mes}-${year}).xlsx`,
    });

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      return new StreamableFile(stream); //jspdf  la biblioteca y la forma en que exporte los archivos
    } catch (error) {
      throw new HttpException(
        'Error al generar el reporte: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }


// agregando los gets para extender el controlador con pdf

@Header('Content-Type', 'application/pdf')
@Header('Content-Disposition', `attachment; filename=trabajadores(${new Date().toISOString().split('T')[0]}).pdf`)
@ApiBody({ type: ClavesDto })
@Post('reports/pdf/clavesAusentismo')
async exportAllPdf(@Body() clavesDto: ClavesDto,) {
  try {
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
    const buffer = await this.exportService.getClavesAusentismoPDF(codigos,date, ueb);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
    return new StreamableFile(stream);
  } catch (error) {
    throw new HttpException(
      'Error al generar el reporte: ' + error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

}
  
@Get('reports/pdf/interruptos')
  async getInterruptosPDF(
    @Query('ueb') ueb: string,
    @Query('fecha') fecha: string,
    @Res({ passthrough: true }) res: Response,
  ){
    const buffer = await this.exportService.getInterruptosPDF(ueb, fecha);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);
  

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=interruptos(${ueb}-${fecha}).pdf`,
    });
    return new StreamableFile(stream);
  }



}
