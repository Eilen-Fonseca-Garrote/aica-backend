import { Module } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { AusenciasController } from './ausencias.controller';

@Module({
  providers: [AusenciasService],
  controllers: [AusenciasController]
})
export class AusenciasModule {}
