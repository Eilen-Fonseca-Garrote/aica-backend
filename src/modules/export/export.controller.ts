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
  HttpCode,
} from '@nestjs/common';
import { ExportService } from './export.service';
import { ApiBody, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import { Response } from 'express';
import { ClavesDto } from '../ausencias/dto/claves.dto';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}


  @ApiResponse({
    status: HttpStatus.CREATED, // 201
    description: 'Archivo Excel generado exitosamente.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' }, // Indica que la respuesta es un archivo binario
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR, // 500
    description: 'Error interno del servidor al generar el reporte.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ) // Indica que el endpoint produce un Excel
  @Header(
    'content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename=trabajadores(${new Date().toISOString().split('T')[0]}).xlsx`,
  )
  @HttpCode(HttpStatus.CREATED)
  @Get('excel/all-workers')
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

  @ApiResponse({
    status: HttpStatus.CREATED, // 201
    description: 'Archivo Excel generado exitosamente.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' }, // Indica que la respuesta es un archivo binario
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR, // 500
    description: 'Error interno del servidor al generar el reporte.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ) // Indica que el endpoint produce un Excel
  @Header(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename=modelo14B(${new Date().getMonth() + 1}-${new Date().getFullYear()}).xlsx`,
  )
  @HttpCode(HttpStatus.CREATED)
  @Get('excel/model14b')
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


  @ApiResponse({
    status: HttpStatus.CREATED, // 201
    description: 'Archivo Excel generado exitosamente.',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' }, // Indica que la respuesta es un archivo binario
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR, // 500
    description: 'Error interno del servidor al generar el reporte.',
  })
  @ApiProduces(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ) // Indica que el endpoint produce un Excel
  @Get('excel/ausentismo')
  async exportModelAusentismo(
    @Query('noLabDays') noLabDays: string,
    @Query('fechaAusentismo') fechaAusentismo: string,
    @Res({ passthrough: true }) res: Response, // Inyectar el objeto Response
  ) {
    // Validación de noLabDays
    if (!/^\d+$/.test(noLabDays)) {
      throw new HttpException(
        'noLabDays debe ser un número válido en formato string',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validación de fechaAusentismo
    const dateFormatRegex = /^(0[1-9]|1[0-2])-\d{4}$/;
    if (!dateFormatRegex.test(fechaAusentismo)) {
      throw new HttpException(
        'Formato de fecha inválido. Debe ser MM-YYYY (ej: 02-2023)',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [mes, year] = fechaAusentismo.split('-');

    if (
      parseInt(year) < 2000 ||
      parseInt(year) > new Date().getFullYear() + 1
    ) {
      throw new HttpException(
        `Año inválido. Debe estar entre 2000 y ${new Date().getFullYear() + 1}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Convertir y validar días no laborables
    const diasNoLaborables = parseInt(noLabDays);
    if (diasNoLaborables < 0 || diasNoLaborables > 365) {
      throw new HttpException(
        'Días no laborables deben estar entre 0 y 365',
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const buffer = await this.exportService.generateAusentismoExcel(
        mes,
        parseInt(year),
        parseInt(noLabDays),
      );

      // Configurar los headers usando el objeto Response
      res.set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=modeloRL4(${mes}-${year}).xlsx`,
      });

      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      res.status(HttpStatus.CREATED); // 201
      return new StreamableFile(stream);
    } catch (error) {
      const errorMessage =
        error instanceof HttpException
          ? error.getResponse()
          : `Error al generar el reporte: ${error.message}`;

      throw new HttpException(errorMessage, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Header('Content-Type', 'application/pdf')
@Header('Content-Disposition', `attachment; filename=trabajadores(${new Date().toISOString().split('T')[0]}).pdf`)
@ApiBody({ type: ClavesDto })
@Post('pdf/clavesAusentismo')
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
  
@Get('pdf/interruptos')
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

@Get('pdf/interruptos-test')
async getInterruptosTestPDF(@Res({ passthrough: true }) res: Response) {
  const buffer = await this.exportService.getInterruptosTestPDF();
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename=interruptos-test.pdf`,
  });
  return new StreamableFile(stream);
}

}
