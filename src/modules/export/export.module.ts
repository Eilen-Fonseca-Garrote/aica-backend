import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ExportUtilities } from "./export.utility";
import { AusenciasModule } from "../ausencias/ausencias.module";



@Module({
  imports: [
    HttpModule.register({}), // Configuración básica
    ConfigModule,
    AusenciasModule // <-- Añade el módulo aquí
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportUtilities],
})
export class ExportModule{}
