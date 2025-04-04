import { Module } from "@nestjs/common";
import { BuscarTrabajadorController } from "./buscarTrabajador.controller";
import { BuscarTrabajadorService } from "./buscarTrabajador.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";



@Module({
  imports: [
    HttpModule.register({}), // Configuración básica
    ConfigModule,
  ],
  controllers: [BuscarTrabajadorController],
  providers: [BuscarTrabajadorService],
})
export class BuscarTrabajadorModule{}