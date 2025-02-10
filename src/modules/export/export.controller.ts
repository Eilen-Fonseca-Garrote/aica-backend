import { Controller, Get, Post, Body, Param, Res, Header, StreamableFile  } from '@nestjs/common';
import { ExportService } from './export.service';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@ApiTags('export')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Header(
    'content-type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
  @Header(
    'Content-Disposition',
    `attachment; filename=trabajadores(${new Date().toISOString().split('T')[0]}).xlsx`
  )
  @Get('reports/excel/all-workers')
  async exportAll() {
    const buffer = await this.exportService.generateAllWorkersExcel();
    return new StreamableFile(buffer);
  }

}