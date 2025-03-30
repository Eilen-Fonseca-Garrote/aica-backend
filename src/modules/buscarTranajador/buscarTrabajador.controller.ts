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
  @Get('/condecMisionesTrabajador') //Condecoraciones y misiones
  async condecMisiones( //cambiar nombre
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

  @Get('/estudiosTrabajador') //Estudios
  async getEstudios(
    @Query('ci') ci: string, 
    @Query('ueb') ueb: string
  ) {
    try {
    return this.buscarTrabajadorService.getEstudiosTrabajador(ci, ueb);
  } catch (error) {
    throw new HttpException(
      'Error al generar el reporte: ' + error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  @Get('/informacionFamiliar') //Familia
  async getFamiliares(
    @Query('ci') ci: string, 
    @Query('ueb') ueb: string
  ) {
    try {
    return this.buscarTrabajadorService.getFamiliaresTrabajador(ci, ueb);
  } catch (error) {
    throw new HttpException(
      'Error al generar el reporte: ' + error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

  @Get('/laboralTrabajador') //Datos laborales
  async getLaboral(
    @Query('ci') ci: string, 
    @Query('ueb') ueb: string
  ) {
    try {
    return this.buscarTrabajadorService.getLaboralTrabajador(ci, ueb);
  } catch (error) {
    throw new HttpException(
      'Error al generar el reporte: ' + error.message,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
  //datos personales
  @Get('/trabajador')
    async getPersonalData(
      @Query('ci') ci: string, 
      @Query('ueb') ueb: string) {
      try{
      return this.buscarTrabajadorService.getPersonalesTrabajador(ci,ueb);
      }
      catch (error) {
        throw new HttpException(
          'Error al generar el reporte: ' + error.message,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }

  //Trabajadores por nombre
  @Get('/trabajadoresPorNombre')
  async getTrabajadorNombreCompleto(
    @Query('nomApell') nomApell: string,
    @Query('ueb') ueb: string,
  ) {
    return this.buscarTrabajadorService.getTrabajadorNombreCompleto(nomApell, ueb);
  }
}
