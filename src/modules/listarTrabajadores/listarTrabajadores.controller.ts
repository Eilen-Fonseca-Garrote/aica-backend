import { BadRequestException, Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ListarTrabajadoresService } from './listarTrabajadores.service';
import { ListarTrabajadoresFiltersDto } from './dto/listar-trabajadores-filters.dto';

@ApiTags('listarTrabajadores')
@Controller('listarTrabajadores')
export class ListarTrabajadoresController {
  constructor(private readonly listarTrabajadoresService: ListarTrabajadoresService) {}

  @Get('options')
  async getFilterOptions(@Query('ueb') ueb = '16'): Promise<unknown> {
    if (!ueb) {
      throw new BadRequestException('El parametro ueb es obligatorio.');
    }
    return this.listarTrabajadoresService.getFilterOptions(ueb);
  }

  @Get('areas')
  async getAreas(
    @Query('ueb') ueb: string,
    @Query('direccionId') direccionId: string,
  ): Promise<unknown> {
    if (!ueb || !direccionId) {
      throw new BadRequestException(
        'Los parametros ueb y direccionId son obligatorios.',
      );
    }
    return this.listarTrabajadoresService.getAreasByDireccion(ueb, direccionId);
  }

  @Get('subcategorias')
  async getSubcategorias(
    @Query('ueb') ueb: string,
    @Query('categoria') categoria: string,
  ): Promise<unknown> {
    if (!ueb || !categoria) {
      throw new BadRequestException(
        'Los parametros ueb y categoria son obligatorios.',
      );
    }
    return this.listarTrabajadoresService.getSubcategorias(ueb, categoria);
  }

  @Post('filtrar')
  async filtrarTrabajadores(
    @Body() filtersDto: ListarTrabajadoresFiltersDto,
  ): Promise<unknown> {
    if (!filtersDto.uebSelect) {
      throw new BadRequestException('El campo uebSelect es obligatorio.');
    }
    return this.listarTrabajadoresService.filtrarTrabajadores(filtersDto);
  }
}
