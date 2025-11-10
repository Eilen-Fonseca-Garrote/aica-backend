// export.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExportUtilities } from '../export/export.utility';
import { EntityManager } from 'typeorm';

@Injectable()
export class CalcularPromedioService {
    private baseUri: string;
    constructor(
      private readonly configService: ConfigService,
      private readonly entityManager: EntityManager,
      private readonly utils: ExportUtilities,      
    ) {
      this.getBaseUri();
    }
  
    private getBaseUri() {
      this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
    }
   
    async getPromedioMensual(ueb: string, fecha: string) {
      // Parse date
      const [anno, mesStr] = fecha.split('-');
      const mes = parseInt(mesStr);
      
      // Initialize variables
      let promedio: any = null;
      let total: any[] = [];
      let direccionLiorad = 11;
      
      // Set direccionLiorad based on date
      if ((mes >= 8 && anno === "2020") || anno > "2020") {
        direccionLiorad = 276;
      }
  
      // Get clave26 (assuming this is a separate service)
      const clave26 = await this.getPromedioByClaveId('26');
      console.log("clave26", clave26)
      const clave26Restar = clave26[0].restar;
  
      if (ueb === "0") {
        // Handle case for UEB 0
        const fuentePrimaria = await this.getFuentePrimaria();
        const promedioTotal = await this.calcularPromedioGeneral(clave26[0], mes, anno, fecha, fuentePrimaria);
        
        return {
          promedio: null,
          promedioAica: promedioTotal['AICA']?.promedio,
          promedioLiorad: promedioTotal['LIORAD']?.promedio,
          promedioCitox: promedioTotal['CITOSTÁTICOS']?.promedio,
          promedioJT: promedioTotal['JULIO TRIGO']?.promedio,
          promedioSH: promedioTotal['SH+']?.promedio,
          total: promedioTotal['total'],
          todasUeb: promedioTotal['todasUEB'],
          clave26: clave26Restar
        };
      } else {
        // Handle specific UEB cases
        const clave26Todas = await this.getBajaTrab(ueb, mesStr, anno);
  
        switch (ueb) {
          case "55":
            promedio = await this.getPromTrabajadores(ueb, "287", mes, anno);
            break;
          case "25":
            promedio = await this.getPromTrabajadores(ueb, direccionLiorad.toString(), mes, anno);
            break;
          case "100":
            promedio = await this.getPromTrabajadores(ueb, "285", mes, anno);
            break;
          case "57":
            promedio = await this.getPromTrabajadores("57", "302", mes, anno);
            break;
          default:
            promedio = await this.getPromTrabajadores(ueb, "%%", mes, anno);
        }
  
        // Special handling for UEB 25 and 55
        if (ueb === "25" || ueb === "55") {
          const clave36 = await this.getFisicoMujeres(ueb, mesStr, anno);
          promedio = this.restaClave36(promedio, clave36);
        }
        total = this.addTotalPromedioMensual(promedio, 0, total, clave26Todas);
  
        return {
          promedio,
          total,
          clave26: clave26Restar
        };
      }
    }

    async getPromedioRango(ueb: string, direccion: string, fecha: string): Promise<any> {
      const [anno, mes] = fecha.split('-');
      console.log("DIRECCION", direccion)
      let finalDireccion = direccion;
  
      // Handle special cases for UEB 25
      if (ueb === "25") {
        const mesNum = parseInt(mes);
        if (mesNum >= 9 && anno === "2020") {
          finalDireccion = "276";
        } else if (mesNum < 9 && anno === "2020") {
          finalDireccion = "11";
        }
      }
  
      try {        
        let promedio = await this.getPromTrabajadoresRangoFechas(ueb, finalDireccion, mes, fecha);
  
        // Apply special processing if direccion is 1
        if (direccion === "1") {
          promedio = this.getPromedioDirGeneral(promedio);
        }
        console.log("ASD", promedio)
        const unidad = promedio.length > 0 ? promedio[0].Unidad : "";
        const total = this.getTotalPromedioDiario(promedio);
        const uebName = await this.getUEBByCode(ueb);
  
        return {
          promedio,
          total,
          fecha,
          ueb: uebName,
          direcc: unidad
        };
      } catch (error) {
        throw new Error(`Failed to fetch promedio rango: ${error.message}`);
      }
    }

    private getPromedioDirGeneral(promedio: any[]): any[] {
      return promedio.filter(prom => {
        const dir = prom.Unidad?.trim();
        return dir === "DIR. GENERAL";
      });
    }
  
    private getUEBByCode(code: string): string {
      switch (code) {
        case "16": return "AICA";
        case "55": return "Julio Trigo";
        case "25": return "Liorad";
        case "57": return "SH+";
        default: return "CITOX";
      }
    }
    
    private getTotalPromedioDiario(promedio: any[]): { Promedio: number; PromedioMujeres: number }[] {
      // If you need to maintain exact PHP behavior with index 0
      const resultado: { Promedio: number; PromedioMujeres: number }[] = [];
      
      const totals = {
          Promedio: promedio.reduce((sum, prom) => sum + (prom.HPDTT || 0), 0),
          PromedioMujeres: promedio.reduce((sum, prom) => sum + (prom.HPDTM || 0), 0)
      };
  
      resultado[0] = totals; // Now TypeScript understands the type
      return resultado;
  }
  
    async getPromedioByClaveId(id: string): Promise<any[]> {
      try {
        // Using parameterized query to prevent SQL injection
        const results = await this.entityManager.query(
          `SELECT * FROM promedio WHERE clave = ?`,
          [id]
        );
        
        // If you need to return the first item like in the PHP version:
        // return results.length > 0 ? [results[0]] : [];
        
        return results;
      } catch (error) {
        throw new Error(`Failed to fetch promedio by clave: ${error.message}`);
      }
    }

    private async getFuentePrimaria(entidad: number = 1): Promise<any> {
      try {
        const mockFileName = `fuentePrimaria_${entidad}.json`;
      const mockData = this.utils.loadMock(mockFileName, 'calcularPromedio');
      let response: any;
      if (mockData) {
        response = { data: mockData };
      }
        response = await axios.get(
          `${this.baseUri}/fuente_primaria/laboratorios?entidad=${entidad}`
        );
        this.utils.mockFunction(response.data, `fuentePrimaria_${entidad}.json`, 'calcularPromedio')
        const fuentePrimariaSvc = response.data;
    
        const arrayResult: any = {};
        
        for (const fc of fuentePrimariaSvc) {
          const ueb = fc.nombre;
          const codigo = fc.codigo;
          
          arrayResult[ueb] = {
            codigo,
            direccion: '',
            diminutivo: ''
          };
    
          switch (ueb) {
            case 'LIORAD':
              arrayResult[ueb].direccion = '276';
              arrayResult[ueb].diminutivo = 'Liorad';
              break;
            case 'JULIO TRIGO':
              arrayResult[ueb].direccion = '287';
              arrayResult[ueb].diminutivo = 'JT';
              break;
            case 'CITOSTÁTICOS':
              arrayResult[ueb].direccion = '285';
              arrayResult[ueb].diminutivo = 'CITOX';
              break;
            case 'SH+':
              arrayResult[ueb].direccion = '302';
              arrayResult[ueb].diminutivo = 'SH';
              break;
            case 'AICA':
              arrayResult[ueb].diminutivo = 'AICA';
              break;
          }
        }
    
        return arrayResult;
      } catch (error) {
        throw new Error('Error en el servicio de fuente primaria');
      }
    }

    private async calcularPromedioGeneral(
      clave26: any,
      mes: number,
      anno: string,
      fecha: string,
      fuentePrimaria: any
    ): Promise<any> {
      const promedioGeneral: any = {};
      const total: any[] = [];
      const [mesStr] = fecha.split('-');
    
      try {
        let indice = 0;
        
        for (const [ueb, fc] of Object.entries(fuentePrimaria)){
          const codigo = (fc as any).codigo;
          let clave26Param: any = false;
    
          if (clave26.restar === 1) {
            clave26Param = await this.getBajaTrab(codigo, mesStr, anno);
          }
    
          promedioGeneral[ueb] = { promedio: null };
    
          if ((fc as any).direccion) {
            const direccion = (fc as any).direccion;
            promedioGeneral[ueb].promedio = await this.getPromTrabajadores(
              codigo,
              direccion,
              mes,
              anno
            );
          } else {
            promedioGeneral[ueb].promedio = await this.getPromTrabajadores(
              codigo,
              '%%',
              mes,
              anno
            );
          }
    
          this.addTotalPromedioMensual(
            promedioGeneral[ueb].promedio,
            indice,
            total,
            clave26Param
          );
          indice++;
        }
    
        promedioGeneral.total = total;
        promedioGeneral.todasUEB = this.calcTotalTodasUEB(total);
    
        return promedioGeneral;
      } catch (error) {
        throw new Error('Error calculating general average');
      }
    }
    
    private async getBajaTrab(ueb: string, mes: string, anno: string): Promise<any> {
      try {
        const mockFileName = `bajaTrab_${ueb+'_'+mes+'_'+anno}.json`;
        const mockData = this.utils.loadMock(mockFileName, 'calcularPromedio');
        if (mockData) {
          return mockData;
        }
      
        const response = await axios.get(
          `${this.baseUri}/recursosHumanos/bajaTrab?ueb=${ueb}&mes=${mes}&anno=${anno}`
        );
        this.utils.mockFunction(response.data, `bajaTrab_${ueb+'_'+mes+'_'+anno}.json`, 'calcularPromedio')
        return response.data;
      } catch (error) {
        console.error('Error in getBajaTrab:', error);
        return false; // Matching PHP's behavior
      }
    }

    private async getPromTrabajadores(ueb: string, direccion: string, mes: number, anno: string): Promise<any> {
      try {
        const response = await axios.get(
          `${this.baseUri}/recursosHumanos/promTrabajadores?ueb=${ueb}&direccion=${direccion}&mes=${mes}&anno=${anno}`
        );
        console.log(response)
        this.utils.mockFunction(response.data, `promTrabajadores_${ueb+'_'+direccion+'_'+mes+'_'+anno}.json`, 'calcularPromedio')
        return response.data;
      } catch (error) {
        console.error('Error in getPromTrabajadores:', error);
        return false; // Matching PHP's behavior
      }
    }
    
    private async getFisicoMujeres(ueb: string, mes: string, anno: string): Promise<any> {
      try {
        const mockFileName =`fisicoMujeres_${ueb+'_'+mes+'_'+anno}.json`;
        const mockData = this.utils.loadMock(mockFileName, 'calcularPromedio');
        if (mockData) {
          return mockData;
        }
        const response = await axios.get(
          `${this.baseUri}/recursosHumanos/fisicoMujeres?ueb=${ueb}&mes=${mes}&anno=${anno}`
        );
        this.utils.mockFunction(response.data, `fisicoMujeres_${ueb+'_'+mes+'_'+anno}.json`, 'calcularPromedio')
        return response.data;
      } catch (error) {
        console.error('Error in getFisicoMujeres:', error);
        return false; // Matching PHP's behavior
      }
    }

    private restaClave36(promedio: any[], clave36: any[]): any[] {
      const resultado: any[] = [];
      
      if (clave36.length > 0) {
        for (let i = 0; i < promedio.length; i++) {
          const prom = { ...promedio[i] }; // Create a copy to avoid mutation
          
          prom.HPromFisic = prom.HPromFisic - (clave36[i]?.Total || 0);
          prom.HPromFMuj = prom.HPromFMuj - (clave36[i]?.Total_Mujeres || 0);
          
          resultado.push(prom);
        }
        return resultado;
      }
      
      return promedio;
    }

    private addTotalPromedioMensual(
      promedio: any[] | any[][],
      indice: number,
      resultado: any[],
      clave26: any,
      inicio = false
    ): any[] {
      let totalFisico = 0;
      let totalFisicoMuj = 0;
      let totalPromedio = 0;
      let totalPromedioMujeres = 0;
    
      if (inicio) {
        // Handle nested array case
        for (const promArray of promedio as any[][]) {
          for (const prom of promArray) {
            totalFisico += prom.HPromFisic || 0;
            totalFisicoMuj += prom.HPromFMuj || 0;
            totalPromedio += prom.HPromTot || 0;
            totalPromedioMujeres += prom.HPromMuj || 0;
          }
        }
      } else {
        // Handle flat array case
        for (const prom of promedio as any[]) {
          totalFisico += prom.HPromFisic || 0;
          totalFisicoMuj += prom.HPromFMuj || 0;
          totalPromedio += prom.HPromTot || 0;
          totalPromedioMujeres += prom.HPromMuj || 0;
        }
      }
    
      // Initialize the result object if it doesn't exist
      if (!resultado[indice]) {
        resultado[indice] = {};
      }
    
      resultado[indice] = {
        ...resultado[indice],
        totalFisico,
        totalFisicoMuj,
        totalPromedio,
        totalPromedioMujeres
      };
    
      return resultado;
    }
    
    private calcTotalTodasUEB(total: any[]): any {
      // Implement this method based on your Utilities::calcTotalTodasUEB()
      // This is a placeholder - replace with your actual calculation
      return {
        totalFisico: total.reduce((sum, item) => sum + (item.totalFisico || 0), 0),
        totalFisicoMuj: total.reduce((sum, item) => sum + (item.totalFisicoMuj || 0), 0),
        totalPromedio: total.reduce((sum, item) => sum + (item.totalPromedio || 0), 0),
        totalPromedioMujeres: total.reduce((sum, item) => sum + (item.totalPromedioMujeres || 0), 0)
      };
    }

    async getPromTrabajadoresRangoFechas(ueb: string, finalDireccion: string, mes: string, fecha: string) {
      const url =  `${this.baseUri}/recursosHumanos/promTrabajadoresRangoFechas?ueb=${ueb}&direccion=${finalDireccion}&mes=${mes}&fecha=${fecha}`
      
      try { 
        const response = await axios.get(url)
        this.utils.mockFunction(response.data, `promTrabajadoresRangoFechas_${ueb+'_'+finalDireccion+'_'+mes+'_'+fecha}.json`, 'calcularPromedio')
        console.log(response)
        return response.data; 
      } catch (error) {
        throw new Error(`Error obteniendo datos: ${error.message}`);
      }
    }
    


}
