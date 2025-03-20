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
import { BuscarTrabajadorService } from './buscarTrabajador.service';
import { ApiTags } from '@nestjs/swagger';
import { Readable } from 'stream';
import { Response } from 'express';

@ApiTags('buscarTrabajador')
@Controller('buscarTrabajador')
export class BuscarTrabajadorController {
  constructor(private readonly buscarTrabajadorService: BuscarTrabajadorService) {}

  @Header(
    'content-type',
    'application/json',
  )
  @Get('/condecMisionesTrabajador')
  async test(
    @Query('ci') ci: string,
    @Query('ueb') ueb: string,
    @Query('type') type: string,
  ) {
    
    try {
        return this.buscarTrabajadorService.getCondecoracionesMisiones(ci, ueb, type);
    } catch (error) {
      throw new HttpException(
        'Error al generar el reporte: ' + error.message,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
