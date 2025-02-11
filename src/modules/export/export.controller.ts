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
} from '@nestjs/common';
import { ExportService } from './export.service';
import { ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';

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
      console.error('Error en exportAll:', error.message);
      throw new HttpException(
        'Error al generar el reporte: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
