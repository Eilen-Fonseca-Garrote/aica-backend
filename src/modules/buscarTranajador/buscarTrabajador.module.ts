import { Module } from "@nestjs/common";
import { BuscarTrabajadorController } from "./buscarTrabajador.controller";
import { BuscarTrabajadorService } from "./buscarTrabajador.service";
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
  controllers: [BuscarTrabajadorController],
  providers: [BuscarTrabajadorService, ExportUtilities],
})
export class BuscarTrabajadorModule{}