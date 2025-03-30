import { Controller, Get, Post, Query,Body} from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { FiltersDto } from './dto/filters.dto';

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
  async getTrabajadoresInterruptos(@Query('ueb') ueb: string, @Query('fecha') fecha: string) {
    return this.ausenciasService.listTrabajadoresInterruptos(ueb, fecha);
  }


}

