// export.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';
import {
  DireccionModelo14B,
  UEBModelo14B,
} from '../../common/types/model14b.types';
import { AusentismoData } from '../../common/types/absenteeism.types';

@Injectable()
export class BuscarTrabajadorService {
  private baseUri: string;
  constructor(
    private readonly configService: ConfigService,
  ) {
    this.getBaseUri();
  }

  private getBaseUri() {
    this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
  }

  async getCondecoracionesMisiones(ci: string, ueb: string, type: string): Promise<any[]> {
    const url = `${this.baseUri}/recursosHumanos/condecMisionesTrabajadorCI?ci=${ci}&ueb=${ueb}`;
    const response = await axios.get(url);
    const condecMisiones = response.data;

    return this.filterCondecoraciones(condecMisiones, type);
  }

  private filterCondecoraciones(serviceResponse: any[], type: string): any[] {
    const result: any[] = [];
    console.log("serviceResponse", serviceResponse)
    for (const sr of serviceResponse) {
      let flag = false;
      let i = 0;

      while (!flag && i < result.length) {
        if (type === 'C') {
          if (result[i].CODIGOCOND === sr.CODIGOCOND) {
            flag = true;
          }
        } else {
          if (result[i].CODIGOMIS === sr.CODIGOMIS) {
            flag = true;
          }
        }
        i++;
      }

      if (!flag) {
        result.push(sr);
      }
    }
    console.log("result", result)
    return result;
  }
}
