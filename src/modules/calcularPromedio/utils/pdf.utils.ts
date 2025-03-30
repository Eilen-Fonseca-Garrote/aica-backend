import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { Injectable } from '@nestjs/common';
// pdf.util.ts
export interface PromedioItem {
  HPromMuj: number;
  HPromFMuj: number;
  HPromTot: number;
  Unidad: string;
  HPromFisic: number;
}

export interface TotalItem {
  totalFisico: number;
  totalFisicoMuj: number;
  totalPromedio: number;
  totalPromedioMujeres: number;
}

export interface PromedioReport {
  promedio: PromedioItem[];
  total: TotalItem[];
  clave26: number;
}

export interface PromedioGeneralReport extends PromedioReport {
  promedioAica?: any;
  promedioLiorad?: any;
  promedioCitox?: any;
  promedioJT?: any;
  promedioSH?: any;
  todasUeb?: any;
}

// src/modules/promedios/interfaces/promedio-diario.interface.ts
export interface PromedioDiario {
  Fecha: string;
  HPDTT: number;
  HPDTM: number;
  Unidad: string;
}

export interface TotalDiario {
  Promedio: number;
  PromedioMujeres: number;
}

export interface PromedioRangoResponse {
  success: boolean;
  promedio: PromedioDiario[];
  total: TotalDiario;
  fecha: string;
  ueb: string;
  direcc: string;
}

@Injectable()
export class PromedioPdfUtil {
  static async exportPromedioMensualPdf(
    data: {
      promedio: Array<{
        HPromMuj: number;
        HPromFMuj: number;
        HPromTot: number;
        Unidad: string;
        HPromFisic: number;
      }>;
      total: Array<{
        totalFisico: number;
        totalFisicoMuj: number;
        totalPromedio: number;
        totalPromedioMujeres: number;
      }>;
      clave26: number;
    },
    res: Response
  ): Promise<void> {
    const reportData = this.normalizeData(data);
    const doc = new PDFDocument({ margin: 30, size: 'A4' });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=reporte-promedio.pdf'
    );

    doc.pipe(res);

    // 1. Add Header
    doc.fontSize(18)
       .font('Helvetica-Bold')
       .text('REPORTE DE PROMEDIOS', { align: 'center' })
       .moveDown(1);

    // 2. Add Table Header
    doc.fontSize(10)
       .fillColor('#444444')
       .text('UNIDAD', 50, 150)
       .text('TOTAL FÍSICO', 200, 150)
       .text('MUJERES', 300, 150)
       .text('PROMEDIO TOTAL', 400, 150)
       .moveDown(0.5);

    // 3. Add Table Rows
    let y = 170;
    data.promedio.forEach((item) => {
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor('#333333')
         .text(item.Unidad.trim(), 50, y)
         .text(item.HPromFisic.toString(), 200, y)
         .text(item.HPromFMuj.toString(), 300, y)
         .text(item.HPromTot.toString(), 400, y);
      
      y += 25;
      if (y > 700) {  // Add new page if needed
        doc.addPage();
        y = 100;
      }
    });

    // 4. Add Totals
    if (data.total.length > 0) {
      const totals = data.total[0];
      doc.moveDown(2)
         .font('Helvetica-Bold')
         .text('TOTALES GENERALES:', 50, doc.y)
         .moveDown(0.5)
         .font('Helvetica')
         .text(`Total Físico: ${totals.totalFisico}`, 50, doc.y)
         .text(`Total Mujeres: ${totals.totalFisicoMuj}`, 200, doc.y)
         .text(`Promedio Total: ${totals.totalPromedio}`, 350, doc.y)
         .text(`Promedio Mujeres: ${totals.totalPromedioMujeres}`, 500, doc.y);
    }

    // 5. Add Footer
    doc.fontSize(8)
       .text(`Clave 26: ${data.clave26 === 1 ? 'APLICA' : 'NO APLICA'}`, 50, 750, {
         align: 'left'
       })
       .text(`Generado el: ${new Date().toLocaleDateString()}`, 50, 750, {
         align: 'right'
       });

    doc.end();
  }

  static async exportPromedioDiarioPdf(data: PromedioRangoResponse, res: Response): Promise<void> {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=promedio-diario-${data.fecha.replace(/-/g, '')}.pdf`
    );

    doc.pipe(res);

    // Add header
    this.addHeader(doc, data);

    // Add daily table
    this.addDailyTable(doc, data);

    // Add totals
    console.log("data", data)
    this.addTotals(doc, data.total);

    doc.end();
  }

  private static addHeader(doc: PDFDocument, data: PromedioRangoResponse) {
    doc.fontSize(16)
       .font('Helvetica-Bold')
       .text(`REPORTE DIARIO DE PROMEDIOS - ${data.ueb}`, { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(12)
       .font('Helvetica')
       .text(`Período: ${data.fecha}`, { align: 'center' })
       .text(`Unidad: ${data.direcc.trim()}`, { align: 'center' })
       .moveDown(1);
  }

  private static addDailyTable(doc: PDFDocument, data: PromedioRangoResponse) {
    // Table header
    doc.font('Helvetica-Bold')
       .fontSize(10)
       .fillColor('#444444')
       .text('Fecha', 50, 120)
       .text('Total', 150, 120)
       .text('Mujeres', 250, 120)
       .text('Unidad', 350, 120)
       .moveDown(0.5);

    // Table rows
    let y = 140;
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor('#333333');

    data.promedio.forEach(item => {
      doc.text(item.Fecha, 50, y)
         .text(item.HPDTT.toString(), 150, y)
         .text(item.HPDTM.toString(), 250, y)
         .text(item.Unidad.trim(), 350, y);
      y += 20;
      
      // Add page break if needed
      if (y > 500) {
        doc.addPage();
        y = 100;
        this.addHeader(doc, data);
      }
    });
  }

  private static addTotals(doc: PDFDocument, total: TotalDiario) {
    doc.font('Helvetica-Bold')
       .fontSize(12)
       .text('TOTALES GENERALES:', 50, doc.y + 20)
       .font('Helvetica')
       .text(`Promedio Total: ${total[0].Promedio}`, 200, doc.y)
       .text(`Promedio Mujeres: ${total[0].PromedioMujeres}`, 400, doc.y);
  }

  private static normalizeData(data: PromedioReport | PromedioGeneralReport): PromedioReport {
    // Handle case when promedio is null (from PromedioGeneralReport)
    if (data.promedio === null && 'promedioAica' in data) {
      return {
        promedio: [], // Or transform promedioAica/etc into PromedioItem[]
        total: data.total || [],
        clave26: data.clave26
      };
    }
    
    // Default case (PromedioReport)
    return {
      promedio: data.promedio || [],
      total: data.total || [],
      clave26: data.clave26
    };
  }
}