// export.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExportUtilities } from '../export/export.utility';

@Injectable()
export class BuscarTrabajadorService {
  private baseUri: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly utils: ExportUtilities,
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
    return result;
  }

  //Estudios
  async getEstudiosTrabajador(ci: string, ueb: string) {
    const url = `${this.baseUri}/recursosHumanos/estudiosTrabajadorCI?ci=${ci}&ueb=${ueb}`;
    
    try {
      const response = await axios.get(url);
      return response.data; 
    } catch (error) {
      throw new Error(`Error obteniendo datos: ${error.message}`);
    }
  }

  //Familiares
  async getFamiliaresTrabajador(ci: string, ueb: string) {
    const url = `${this.baseUri}/recursosHumanos/informacionFamiliarCI?ci=${ci}&ueb=${ueb}`;
    
    try {
      const response = await axios.get(url);
      return response.data; 
    } catch (error) {
      throw new Error(`Error obteniendo datos: ${error.message}`);
    }
  }

  //Datos Laborales
  async getLaboralTrabajador(ci: string, ueb: string) { 
    const url = `${this.baseUri}/recursosHumanos/laboralTrabajadorCI?ci=${ci}&ueb=${ueb}`;
    
    try {
      const response = await axios.get(url);
      return response.data; 
    } catch (error) {
      throw new Error(`Error obteniendo datos: ${error.message}`);
    }
  }

  //Datos Personales
  async getPersonalesTrabajador(ci: string, ueb: string, personalData: any = null) {
    if (personalData === null) {
      const url = `${this.baseUri}/recursosHumanos/trabajadorCI?ci=${ci}&ueb=${ueb}`;
      try {
      const response = await axios.get(url);
        return response.data; 
      } catch (error) {
        throw new Error(`Error obteniendo datos: ${error.message}`);
      }
    }
    return personalData;
  }

  //Trabajador Por nombre
  async getTrabajadorNombreCompleto(nomApell: string, ueb: string): Promise<any> {
    try {
      const url = `${this.baseUri}/recursosHumanos/trabajadorNombreCompleto?nomApell=${nomApell}&ueb=${ueb}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch trabajador data: ${error.message}`);
    }
  }



}
