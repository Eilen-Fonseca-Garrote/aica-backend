import { Module } from "@nestjs/common";
import { ExportController } from "./export.controller";
import { ExportService } from "./export.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { ExportUtilities } from "./export.utility";



@Module({
  imports: [
    HttpModule.register({}), // Configuración básica
    ConfigModule,
  ],
  controllers: [ExportController],
  providers: [ExportService, ExportUtilities],
})
export class ExportModule{}