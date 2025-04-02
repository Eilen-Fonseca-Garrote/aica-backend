import { Module } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { AusenciasController } from './ausencias.controller';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule
  ],
  providers: [AusenciasService],
  controllers: [AusenciasController],
  exports: [AusenciasService] // <-- Añade esta línea
})
export class AusenciasModule {}
