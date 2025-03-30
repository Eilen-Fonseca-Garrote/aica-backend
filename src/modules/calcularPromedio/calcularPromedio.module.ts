import { Module } from "@nestjs/common";
import { CalcularPromedioController } from "./calcularPromedio.controller";
import { CalcularPromedioService } from "./calcularPromedio.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";



@Module({
  imports: [
    HttpModule.register({}), // Configuración básica
    ConfigModule,
  ],
  controllers: [CalcularPromedioController],
  providers: [CalcularPromedioService],
})
export class CalcularPromedioModule{}