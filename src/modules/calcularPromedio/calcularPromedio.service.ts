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
export class CalcularPromedioService {
    private baseUri: string;
    constructor(
      private readonly configService: ConfigService,
    ) {
      this.getBaseUri();
    }
  
    private getBaseUri() {
      this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
    }
   
    //Calcular promedio mensual
  async getPromedioMensual(ueb: string, fecha: string) {
    const clave26 = await this.getPromedioByClaveId(26);
    const [mesStr, annoStr] = fecha.split("-");
    const mes = parseInt(mesStr, 10);
    const anno = parseInt(annoStr, 10);

    let direccionLiorad = 11;
    if ((mes >= 8 && anno === 2020) || anno > 2020) {
      direccionLiorad = 276;
    }

    let promedio = null;
    let total: any[] = [];
    let promedioTotal: any[] = [];

    if (ueb === "0") {
      promedioTotal = await this.calcularPromedioGeneral(clave26, mes, anno, fecha, direccionLiorad);
    } else {
      let clave26Todas = null;
      clave26Todas = await this.fetchData(`/recursosHumanos/bajaTrab?ueb=${ueb}&mes=${mes}&anno=${anno}`);

      const direcciones: Record<string, number> = {
        "55": 287,
        "25": direccionLiorad,
        "100": 285,
        "57": 302
      };

      if (ueb in direcciones) {
        promedio = await this.fetchData(`/recursosHumanos/promTrabajadores?ueb=${ueb}&direccion=${direcciones[ueb]}&mes=${mes}&anno=${anno}`);
      } else {
        promedio = await this.fetchData(`/recursosHumanos/promTrabajadores?ueb=${ueb}&direccion=%%&mes=${mes}&anno=${anno}`);
      }

      if (ueb === "25" || ueb === "55") {
        const clave36 = await this.fetchData(`/recursosHumanos/fisicoMujeres?ueb=${ueb}&mes=${mes}&anno=${anno}`);
        promedio = this.restaClave36(promedio, clave36);
      }

      total = this.addTotalPromedioMensual(promedio, 0, total, clave26Todas);
    }

    if (promedioTotal.length === 0) {
      return { promedio, total, clave26: clave26.restar };
    }

    return {
      promedio,
      promedioAica: promedioTotal[0],
      promedioLiorad: promedioTotal[1],
      promedioCitox: promedioTotal[2],
      promedioJT: promedioTotal[3],
      promedioSH: promedioTotal[4],
      total: promedioTotal[5],
      todasUeb: promedioTotal[6],
      clave26: clave26.restar
    };
  }

  private async fetchData(endpoint: string) {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.baseUri}${endpoint}`));
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo datos de ${endpoint}: ${error.message}`);
    }
  }

  private async getPromedioByClaveId(claveId: number) {
    return { restar: 10 };
  }

  private async calcularPromedioGeneral(clave26: any, mes: number, anno: number, fecha: string, direccion: number) {
    return [1, 2, 3, 4, 5, 6, 7]; 
  }

  private restaClave36(promedio: any, clave36: any) {
    return promedio; 
  }

  private addTotalPromedioMensual(promedio: any, valor: number, total: any[], clave26Todas: any) {
    return total; 
  }
//---------------------------------------------------------------------//
  //Exportar a PDF Promedio mensual
  async getPromedioMensualPDF(ueb: string, fecha: string, res: Response) {
    const clave26 = await this.getPromedioByClaveId(26);
    const [mesStr, annoStr] = fecha.split("-");
    const mes = parseInt(mesStr, 10);
    const anno = parseInt(annoStr, 10);

    let direccionLiorad = 11;
    if ((mes >= 8 && anno === 2020) || anno > 2020) {
      direccionLiorad = 276;
    }

    let promedio: any = [];
    let total: any[] = [];
    let promedioTotal: any[] = [];
    let clave26Todas = null;
    let uebName = '';

    if (ueb === "0") {
      promedioTotal = await this.calcularPromedioGeneral(clave26, mes, anno, fecha, direccionLiorad);
    } else {
      clave26Todas = await this.fetchData(`/recursosHumanos/bajaTrab?ueb=${ueb}&mes=${mes}&anno=${anno}`);

      const direcciones: Record<string, number> = {
        "55": 287,
        "25": direccionLiorad,
        "100": 285,
        "57": 302
      };

      if (ueb in direcciones) {
        promedio = await this.fetchData(`/recursosHumanos/promTrabajadores?ueb=${ueb}&direccion=${direcciones[ueb]}&mes=${mes}&anno=${anno}`);
      } else {
        promedio = await this.fetchData(`/recursosHumanos/promTrabajadores?ueb=${ueb}&direccion=%%&mes=${mes}&anno=${anno}`);
      }

      if (ueb === "25" || ueb === "55") {
        const clave36 = await this.fetchData(`/recursosHumanos/fisicoMujeres?ueb=${ueb}&mes=${mes}&anno=${anno}`);
        promedio = this.restaClave36(promedio, clave36);
      }

      uebName = await this.getUEBByCode(ueb);
      total = this.addTotalPromedioMensual(promedio, 0, total, clave26Todas);
    }

    // Generar PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=PromedioMensual_${fecha}.pdf`);

    doc.pipe(res);
    doc.fontSize(18).text('Reporte de Promedio Mensual', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Fecha: ${fecha}`);
    doc.text(`UEB: ${uebName}`);
    doc.moveDown();

    if (promedioTotal.length === 0) {
      doc.text(`Clave 26: ${clave26.restar}`);
      doc.text(`Total: ${JSON.stringify(total)}`);
    } else {
      doc.text(`Promedio AICA: ${promedioTotal[0]}`);
      doc.text(`Promedio Liorad: ${promedioTotal[1]}`);
      doc.text(`Promedio Citox: ${promedioTotal[2]}`);
      doc.text(`Promedio JT: ${promedioTotal[3]}`);
      doc.text(`Promedio SH: ${promedioTotal[4]}`);
      doc.text(`Total: ${promedioTotal[5]}`);
      doc.text(`Todas UEB: ${promedioTotal[6]}`);
    }

    doc.end();
  }

  private async fetchData(endpoint: string) {
    try {
      const response = await firstValueFrom(this.httpService.get(`${this.baseUri}${endpoint}`));
      return response.data;
    } catch (error) {
      throw new Error(`Error obteniendo datos de ${endpoint}: ${error.message}`);
    }
  }

  private async getPromedioByClaveId(claveId: number) {
    return { restar: 10 }; // Simulación del método en Laravel
  }

  private async calcularPromedioGeneral(clave26: any, mes: number, anno: number, fecha: string, direccion: number) {
    return [1, 2, 3, 4, 5, 6, 7]; // Simulación del cálculo
  }

  private async getUEBByCode(ueb: string) {
    return `UEB_${ueb}`; // Simulación de conversión de código a nombre
  }

  private restaClave36(promedio: any, clave36: any) {
    return promedio; // Simulación de la resta
  }

  private addTotalPromedioMensual(promedio: any, valor: number, total: any[], clave26Todas: any) {
    return total; // Simulación del cálculo
  }


//---------------------------------------------------------------------//
    //Calcular promedio diario

    async getPromedioRangoAjax(ueb: string, direccion: string, fecha: string) {
        const [anno, mes] = fecha.split("-");
        let unidad = '';
        let uebName = await this.getUEBByCode(ueb);
    
        // Ajuste de dirección según UEB y fecha
        if (ueb === "25" && parseInt(mes) >= 9 && anno === "2020") {
          direccion = "276";
        } else if (ueb === "25" && parseInt(mes) < 9 && anno === "2020") {
          direccion = "11";
        }
    
        const promedio = await this.fetchData(
          `/recursosHumanos/promTrabajadoresRangoFechas?ueb=${ueb}&direccion=${direccion}&mes=${mes}&fecha=${fecha}`
        );
    
        if (direccion === "1") {
          promedio = this.getPromedioDirGeneral(promedio);
        }
    
        if (promedio.length !== 0) {
          unidad = promedio[0]['Unidad'];
        }
    
        const total = this.getTotalPromedioDiario(promedio);
    
        return {
          promedio,
          total,
          fecha,
          ueb: uebName,
          direcc: unidad,
        };
      }
    //---------------------------------------------------------------------//
    //Exportar a PDF promedio diario
    
      async getPromedioRangoPDF(ueb: string, direccion: string, fecha: string, res: Response) {
        const [anno, mes] = fecha.split("-");
        let unidad = '';
    
        // Ajuste de dirección según UEB y fecha
        if (ueb === "25" && parseInt(mes) >= 9 && anno === "2020") {
          direccion = "276";
        } else if (ueb === "25" && parseInt(mes) < 9 && anno === "2020") {
          direccion = "11";
        }
    
        let promedio = await this.fetchData(
          `/recursosHumanos/promTrabajadoresRangoFechas?ueb=${ueb}&direccion=${direccion}&mes=${mes}&fecha=${fecha}`
        );
    
        if (direccion === "1") {
          promedio = this.getPromedioDirGeneral(promedio);
        }
    
        if (promedio.length !== 0) {
          unidad = promedio[0]['Unidad'];
        }
    
        const total = this.getTotalPromedioDiario(promedio);
    
        // Generar PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=PromedioDiario_${fecha}.pdf`);
    
        doc.pipe(res);
        doc.fontSize(18).text('Reporte de Promedio Diario', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Fecha: ${fecha}`);
        doc.text(`UEB: ${ueb}`);
        doc.text(`Dirección: ${unidad}`);
        doc.moveDown();
    
        doc.text('Promedios:');
        promedio.forEach((p: any, index: number) => {
          doc.text(`${index + 1}. ${JSON.stringify(p)}`);
        });
    
        doc.text(`Total: ${JSON.stringify(total)}`);
        doc.end();
      }
    
      private async fetchData(endpoint: string) {
        try {
          const response = await firstValueFrom(this.httpService.get(`${this.baseUri}${endpoint}`));
          return response.data;
        } catch (error) {
          throw new Error(`Error obteniendo datos de ${endpoint}: ${error.message}`);
        }
      }
    
      private async getUEBByCode(ueb: string) {
        return `UEB_${ueb}`; // Simulación de conversión de código a nombre
      }
    
      private getPromedioDirGeneral(promedio: any) {
        return promedio; // Simulación de transformación
      }
    
      private getTotalPromedioDiario(promedio: any) {
        return promedio.length; // Simulación de cálculo total
      }  

}
