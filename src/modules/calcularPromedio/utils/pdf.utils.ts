import { Response } from 'express';
import jsPDF from 'jspdf';
import { Injectable } from '@nestjs/common';
import 'jspdf-autotable';

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
  total: TotalDiario[];
  fecha: string;
  ueb: string;
  direcc: string;
}

export interface PromedioMensual {
  HPromMuj: number;
  HPromFMuj: number;
  HPromTot: number;
  Unidad: string;
  HPromFisic: number;
}

export interface TotalMensual {
  totalFisico: number;
  totalFisicoMuj: number;
  totalPromedio: number;
  totalPromedioMujeres: number;
}

export interface PromedioMensualResponse {
  success: boolean;
  promedio: PromedioDiario[];
  total: TotalDiario[];
  fecha: string;
  ueb: string;
  direcc: string;
}



@Injectable()
export class PromedioPdfUtil {
  static async exportPromedioMensualPdf(
    data: {
      promedio: PromedioMensual[];
      total: TotalMensual[];
      clave26: number;
    },
    res: Response
  ): Promise<void> {
    const doc = new jsPDF();
  
    // 1. Add Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORTE DE PROMEDIOS MENSUALES', 105, 20, { align: 'center' });
  
    // 2. Prepare table data
    const tableData = data.promedio.map(item => [
      item.Unidad.trim(),
      item.HPromFisic.toString(),
      item.HPromFMuj.toString(),
      item.HPromMuj.toString(),
      item.HPromTot.toString()
    ]);
  
    // 3. Add Main Table
    (doc as any).autoTable({
      startY: 30,
      head: [['UNIDAD', 'FÍSICO TOTAL', 'MUJERES (FÍSICO)', 'MUJERES (PROMEDIO)', 'PROMEDIO TOTAL']],
      body: tableData,
      headStyles: {
        fillColor: [68, 68, 68],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        font: 'helvetica',
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
      },
      margin: { left: 10 }
    });
  
    // 4. Add Totals Section - NOW VERTICALLY ALIGNED
    if (data.total.length > 0) {
      const totals = data.total[0];
      const finalY = (doc as any).lastAutoTable.finalY + 20; // Extra space
      
      doc.setFont('helvetica', 'bold');
      doc.text('TOTALES GENERALES:', 20, finalY);
      
      doc.setFont('helvetica', 'normal');
      let currentY = finalY + 10; // Start 10 units below the title
      
      doc.text(`• Físico Total: ${totals.totalFisico}`, 30, currentY);
      currentY += 8; // Move down for next line
      
      doc.text(`• Mujeres (Físico): ${totals.totalFisicoMuj}`, 30, currentY);
      currentY += 8;
      
      doc.text(`• Promedio Total: ${totals.totalPromedio}`, 30, currentY);
      currentY += 8;
      
      doc.text(`• Mujeres (Promedio): ${totals.totalPromedioMujeres}`, 30, currentY);
    }
  
    // 5. Add Footer
    doc.setFontSize(8);
    doc.text(`Clave 26: ${data.clave26 === 1 ? 'APLICA' : 'NO APLICA'}`, 20, 285);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 160, 285, { align: 'right' });
  
    // Send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=reporte-promedio-mensual.pdf');
    res.send(Buffer.from(doc.output('arraybuffer')));
  }

  static async exportPromedioDiarioPdf(data: PromedioRangoResponse, res: Response): Promise<void> {
    const doc = new jsPDF('landscape');

    // Add header
    this.addHeaderReporteDiario(doc, data);

    // Prepare table data
    const tableData = data.promedio.map(item => [
      item.Fecha,
      item.HPDTT.toString(),
      item.HPDTM.toString(),
      item.Unidad.trim()
    ]);

    // Add daily table
    (doc as any).autoTable({
      startY: 40,
      head: [['Fecha', 'Total', 'Mujeres', 'Unidad']],
      body: tableData,
      headStyles: {
        fillColor: [68, 68, 68],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        font: 'helvetica',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 40 },
        2: { cellWidth: 40 },
        3: { cellWidth: 60 }
      }
    });

    // Add totals
    console.log("asd", data)
    if (data.total.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      this.addTotalsReporteMensaul(doc, data.total[0], finalY);
    }

    // Set response headers and send PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=promedio-diario-${data.fecha.replace(/-/g, '')}.pdf`
    );
    res.send(Buffer.from(doc.output('arraybuffer')));
  }

  private static addHeaderReporteDiario(doc: jsPDF, data: PromedioRangoResponse) {
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`REPORTE DIARIO DE PROMEDIOS - ${data.ueb}`, 140, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${data.fecha}`, 140, 25, { align: 'center' });
    doc.text(`Unidad: ${data.direcc.trim()}`, 140, 30, { align: 'center' });
  }

  private static addTotalsReporteMensaul(doc: jsPDF, total: TotalDiario, yPosition: number) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTALES GENERALES:', 20, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Promedio Total: ${total.Promedio}`, 20, yPosition + 10);
    doc.text(`Promedio Mujeres: ${total.PromedioMujeres}`, 20, yPosition + 20);
  }
}