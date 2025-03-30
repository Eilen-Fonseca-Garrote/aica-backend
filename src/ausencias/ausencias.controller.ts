import { Controller, Get, Query } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';

@Controller('ausencias')
export class AusenciasController {
  constructor(private readonly ausenciasService: AusenciasService) {}

  @Get('claves')
  async getClaves(@Query('ueb') ueb: string, @Query('fecha') fecha: string) {
    return this.ausenciasService.listAusentismoClaves(ueb, fecha);
  }
}