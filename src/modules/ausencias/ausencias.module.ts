import { Module } from '@nestjs/common';
import { AusenciasService } from './ausencias.service';
import { AusenciasController } from './ausencias.controller';
import { ConfigModule } from '@nestjs/config';
import { ExportUtilities } from '../export/export.utility';

@Module({
  imports: [
    ConfigModule
  ],
  providers: [AusenciasService, ExportUtilities],
  controllers: [AusenciasController],
  exports: [AusenciasService] 
})
export class AusenciasModule {}
