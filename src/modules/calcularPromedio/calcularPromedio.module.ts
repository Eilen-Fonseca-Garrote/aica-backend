import { Module } from "@nestjs/common";
import { CalcularPromedioController } from "./calcularPromedio.controller";
import { CalcularPromedioService } from "./calcularPromedio.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ExportUtilities } from "../export/export.utility";
import { ExportModule } from "../export/export.module";


@Module({
  imports: [
    HttpModule.register({}), // Configuración básica
    ConfigModule,
    ExportModule,
  ],
  controllers: [CalcularPromedioController],
  providers: [CalcularPromedioService, ExportUtilities],
})
export class CalcularPromedioModule{}