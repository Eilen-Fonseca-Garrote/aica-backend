import { Module } from '@nestjs/common';
import { ListarTrabajadoresController } from './listarTrabajadores.controller';
import { ListarTrabajadoresService } from './listarTrabajadores.service';

@Module({
  controllers: [ListarTrabajadoresController],
  providers: [ListarTrabajadoresService],
})
export class ListarTrabajadoresModule {}
