// export.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jsPDF } from 'jspdf';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import{ClaveAusentismo} from '../../common/types/claves.types'
import {
  createReadStream,
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from 'fs';
import {
  DireccionModelo14B,
  UEBModelo14B,
} from '../../common/types/model14b.types';
import { AusentismoData } from '../../common/types/absenteeism.types';
import { ExportUtilities } from './export.utility';
import { Logger } from '@nestjs/common';
import { Response } from 'express';
import { AusenciasService } from '../ausencias/ausencias.service';
import { applyPlugin } from 'jspdf-autotable';
import { autoTable } from 'jspdf-autotable';

@Injectable()
export class ExportService {
  private baseUri: string;
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly utils: ExportUtilities,
    private readonly ausenciasService: AusenciasService, // <-- Inyecta el servicio
  ) {
    this.getBaseUri();
  }

  private getBaseUri() {
    this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
    this.utils.setBaseUri(this.baseUri);
  }
  async generateAllWorkersPdf(): Promise<Buffer> {
    // Implementation for generating PDF file
    const pdfBuffer = Buffer.from('PDF content here'); // Replace with actual PDF generation logic
    return pdfBuffer;
  }
  private async getWorkers(baseUri: string): Promise<any[]> {
    try {
      const { data } = await axios.get(`${baseUri}/trabVillar`);
      return data.Trabajadores || [];
    } catch (error) {
      console.error('Error en getTrabajadores:', error);
      throw new Error('Error al obtener datos de trabajadores');
    }
  }

  public async generateAllWorkersExcel() {
    try {
      const trabajadores = await this.getWorkers(this.baseUri);

      if (!existsSync('temp')) mkdirSync('temp');
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Trabajadores');

      // Definir columnas con anchos personalizados
      worksheet.columns = [
        { header: 'Nombre y Apellidos', key: 'nombreCompleto', width: 40 },
        { header: 'UEB', key: 'ueb', width: 20 },
        { header: 'Unidad', key: 'unidad', width: 35 },
        { header: 'Área', key: 'area', width: 40 },
        { header: 'Cargo', key: 'cargo', width: 40 },
        { header: 'Grupo Escala', key: 'grupoEscala', width: 20 },
        { header: 'Nivel Escolar Cargo', key: 'nivelEscolarCargo', width: 20 },
        { header: 'Expediente Laboral', key: 'expedienteLaboral', width: 20 },
        {
          header: 'Categoría Ocupacional',
          key: 'categoriaOcupacional',
          width: 20,
        },
        { header: 'Salario', key: 'salario', width: 20 },
        { header: 'Código Marcaje', key: 'codigoMarcaje', width: 20 },
        { header: 'Edad', key: 'edad', width: 20 },
        { header: 'Sexo', key: 'sexo', width: 20 },
        { header: 'Nivel Escolar', key: 'nivelEscolar', width: 20 },
        { header: 'No Identidad', key: 'noIdentidad', width: 20 },
        { header: 'PCC', key: 'pcc', width: 20 },
        { header: 'UJC', key: 'ujc', width: 20 },
        { header: '1Cam-2min-3Otr', key: 'camMinOtr', width: 20 },
        { header: 'Cumple Req', key: 'cumpleReq', width: 20 },
        { header: '1Simult-2CobDif', key: 'simultCobDif', width: 20 },
        { header: 'Jubilado Cont', key: 'jubiladoCont', width: 20 },
        { header: 'Tiene Auto', key: 'tieneAuto', width: 20 },
        { header: 'Imprescindible', key: 'imprescindible', width: 20 },
        { header: 'Trb Ubic Defensa', key: 'trbUbicDefensa', width: 20 },
        { header: 'Color de Piel', key: 'colorPiel', width: 20 },
        { header: 'Estud', key: 'estud', width: 20 },
        { header: 'Comp', key: 'comp', width: 20 },
        { header: 'Graduado de', key: 'graduadoDe', width: 30 },
        { header: 'No Resolución', key: 'noResolucion', width: 20 },
        { header: 'Master-Doct', key: 'masterDoct', width: 20 },
        { header: 'Dirección', key: 'direccion', width: 50 },
        { header: 'Nombres', key: 'nombres', width: 20 },
        { header: 'Apellido 1', key: 'apellido1', width: 20 },
        { header: 'Apellido 2', key: 'apellido2', width: 20 },
        { header: 'Desig Func', key: 'desigFunc', width: 20 },
        { header: 'Especialidad', key: 'especialidad', width: 20 },
        { header: 'Talla Camisa', key: 'tallaCamisa', width: 20 },
        { header: 'Talla Pantalón', key: 'tallaPantalon', width: 20 },
        { header: 'Talla Zapato', key: 'tallaZapato', width: 20 },
      ];

      // Estilo para encabezados
      worksheet.getRow(1).eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF65B1C4' },
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Función auxiliar para campos booleanos
      const formatBoolean = (value) => {
        const strVal = value?.toString().trim() || '';
        if (strVal === '1') return 'Sí';
        if (strVal === '0') return 'No';
        return '-'; // Para valores vacíos o no reconocidos
      };

      // Función auxiliar para manejar campos vacíos y valores 0
      const formatValue = (value) => {
        if (value === 0 || value === '0') {
          return '0'; // Mantener los 0 como texto
        }
        if ((!value && value !== 0) || value.toString().trim() == '') {
          return '-'; // Reemplazar campos vacíos o nulos por '-'
        }
        return value.toString().trim();
      };

      // Agregar datos de trabajadores
      trabajadores.forEach((trabajador) => {
        const row = worksheet.addRow({
          nombreCompleto: formatValue(trabajador.Nombre),
          ueb: formatValue(trabajador.UEB),
          unidad: formatValue(trabajador.Unidad),
          area: formatValue(trabajador.Area),
          cargo: formatValue(trabajador.Cargo),
          grupoEscala: formatValue(trabajador['Grp Escala']),
          nivelEscolarCargo: formatValue(trabajador.NivEsc_Cargo),
          expedienteLaboral: formatValue(trabajador.Exp_Lab),
          categoriaOcupacional: formatValue(trabajador.CatOcup),
          salario: formatValue(trabajador.Salario),
          codigoMarcaje: formatValue(trabajador['Código Tarjeta Marcaje']),
          edad: formatValue(trabajador.edad),
          sexo: formatValue(trabajador.Sexo),
          nivelEscolar: formatValue(trabajador.NivelEscolar),
          noIdentidad: formatValue(trabajador.No_Identidad),
          pcc: formatBoolean(trabajador.PCC),
          ujc: formatBoolean(trabajador.UJC),
          camMinOtr: formatValue(trabajador['1CAM-2MIN-3Otr']),
          cumpleReq: formatValue(trabajador.CumpleReq),
          simultCobDif: formatValue(trabajador['1Simult-2CobDif']),
          jubiladoCont: formatBoolean(trabajador.JubiladoCont),
          tieneAuto: formatBoolean(trabajador.Aut),
          imprescindible: formatBoolean(trabajador.Imprescindible),
          trbUbicDefensa: formatValue(trabajador.Defensa),
          colorPiel: formatValue(trabajador.ColorPiel),
          estud: formatBoolean(trabajador.Estud),
          comp: formatBoolean(trabajador.Comp),
          graduadoDe: formatValue(trabajador['Graduado_de(Carrera)']),
          noResolucion: formatValue(trabajador.NoResolucion),
          masterDoct: formatValue(trabajador.Master_Doct),
          direccion: formatValue(trabajador['Dirección Oficial']),
          nombres: formatValue(trabajador.Nombres),
          apellido1: formatValue(trabajador['1erApellido']),
          apellido2: formatValue(trabajador['2doApellido']),
          desigFunc: formatValue(trabajador.Desig_Func),
          especialidad: formatValue(trabajador.Especialidad),
          tallaCamisa: formatValue(trabajador['Talla_Camisa']),
          tallaPantalon: formatValue(trabajador['Talla_Pantalon']),
          tallaZapato: formatValue(trabajador['Talla_Zapato']),
        });

        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
        });
      });

      // Congelar la primera fila
      worksheet.views = [
        {
          state: 'frozen',
          ySplit: 1,
        },
      ];

      // Auto filtro
      worksheet.autoFilter = {
        from: 'A1',
        to: `AM${worksheet.rowCount}`, //En caso de añadirse o eliminarse columnas, modificar el valor 'AM'
      };

      const buffer = await workbook.xlsx.writeBuffer();

      return buffer;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  public async exportModel14B() {
    try {
      const client = axios.create({ baseURL: this.baseUri });

      const model14B_apart = await this.processModel14B(client);
      const buffer = await this.generateModel14BExcel(model14B_apart);

      return buffer;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  private async processModel14B(client: any): Promise<UEBModelo14B[]> {
    const uebs = ['16', '100', '25', '55', '57'];
    const result: UEBModelo14B[] = [];

    for (const ueb of uebs) {
      try {
        const uebName = await this.utils.getUEBByCode(ueb);
        const UEBModelo14B: UEBModelo14B = { ueb: uebName, direcciones: [] };

        let direcciones;
        let modelo14B;


        [direcciones, modelo14B] = await Promise.all([
          client.get(`/recursosHumanos/direccionesUEB?ueb=${ueb}`),
          client.get(`/recursosHumanos/modelo14B?ueb=${ueb}`),
        ]);
      
          const direccionesData: DireccionModelo14B[] = Object.values(direcciones.data).map((dir: any) => {
          // Normalize Area: convert object with numeric keys into array
          const areasArray = Array.isArray(dir.Area)
            ? dir.Area
            : Object.keys(dir.Area).map(key => dir.Area[key]);

          return {
            Unidad: dir.Unidad.trim(),
            Area: areasArray.map((area: any) => ({
              Area: area.Area.trim(),
              trabs: modelo14B.data.filter(
                (trab: any) =>
                  dir.Unidad.trim() === trab.EstDesc.trim() &&
                  area.Area.trim() === trab.Expr1.trim()
              ),
            })),
          };
        });


        UEBModelo14B.direcciones = direccionesData;
        result.push(UEBModelo14B);
      } catch (error) {
        console.error(`Error procesando UEB ${ueb}:`, error);
        continue;
      }
    }
    return result;
  }

  private async generateModel14BExcel(data: UEBModelo14B[]) {
    if (!existsSync('temp')) mkdirSync('temp');
    const workbook = new ExcelJS.Workbook();
    const mes = new Date().getMonth() + 1;
    const anno = new Date().getFullYear();
    data.forEach((uebData) => {
      const worksheet = workbook.addWorksheet(uebData.ueb);
      this.createModel14BSheet(worksheet, uebData, mes, anno);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  private createModel14BSheet(
    worksheet: ExcelJS.Worksheet,
    uebData: UEBModelo14B,
    mes: number,
    anno: number,
  ) {
    let currentRow = 1;
    let counter = 1;

    // Encabezado principal
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value =
      'Modelo:Plantilla de Cargo y Registro de Trabajadores';
    worksheet.getCell('A1').style = { font: { bold: true } };

    worksheet.getCell('F1').value = `Fecha: ${mes}/${anno}`;
    worksheet.getCell('F1').style = { font: { bold: true } };

    currentRow++;

    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value = 'Entidad Laboratorios AICA';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    currentRow++;

    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    worksheet.getCell(`A${currentRow}`).value =
      'Tipo de Plantilla: Regulación, Control y Apoyo';
    worksheet.getCell(`A${currentRow}`).style = { font: { bold: true } };

    worksheet.getCell(`F${currentRow}`).value = 'Anexo: No14B';
    worksheet.getCell(`F${currentRow}`).style = { font: { bold: true } };

    currentRow += 2;

    // Encabezados superiores
    const headerRow5 = worksheet.getRow(5);

    worksheet.mergeCells(`A${currentRow}:J${currentRow}`);
    headerRow5.getCell('A').value = 'Datos del Trabajador';

    worksheet.mergeCells(`K${currentRow}:O${currentRow}`);
    headerRow5.getCell('K').value = 'Salario';

    headerRow5.eachCell({ includeEmpty: true }, (cell) => {
      cell.style = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3D8C9F' },
        },
        font: {
          bold: true,
          color: { argb: 'FFFFFFFF' },
        },
        alignment: {
          vertical: 'middle',
          horizontal: 'center',
        },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
    });

    currentRow++;

    const headerRow6 = worksheet.getRow(6);

    // Columnas A-J
    const mainHeaders = [
      'Número',
      'Nombre',
      '1er Apellido',
      '2do Apellido',
      'Sexo',
      'No Expediente Laboral',
      'Nivel de Preparación',
      'Cargo',
      'C/O',
      'Grupo',
    ];

    // Columnas K-O
    const salarioHeaders = [
      'Total',
      'Escala',
      'CLA',
      'Maestría o Doctorado',
      'Otros',
    ];

    // Asignar valores a las celdas
    mainHeaders.forEach((header, index) => {
      headerRow6.getCell(index + 1).value = header;
    });

    salarioHeaders.forEach((header, index) => {
      headerRow6.getCell(11 + index).value = header; // Columna K es 11
    });

    worksheet.columns = [
      { key: 'numero', width: 10 },
      { key: 'nombres', width: 20 },
      { key: 'apellido1', width: 15 },
      { key: 'apellido2', width: 15 },
      { key: 'sexo', width: 10 },
      { key: 'expediente', width: 20 },
      { key: 'nivel', width: 20 },
      { key: 'cargo', width: 30 },
      { key: 'co', width: 10 },
      { key: 'grupo', width: 10 },
      { key: 'total', width: 10 },
      { key: 'escala', width: 10 },
      { key: 'cla', width: 10 },
      { key: 'maestria', width: 20 },
      { key: 'otros', width: 10 },
    ];

    const mainHeaderStyle = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFBBDDE5' },
      },
      font: {
        bold: true,
        color: { argb: '00000000' },
      },
      alignment: {
        vertical: 'middle',
        horizontal: 'center',
      },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    // Aplicar estilos a los encabezados
    worksheet
      .getRow(6)
      .eachCell((cell) => Object.assign(cell, mainHeaderStyle));

    // Auto filtro
    worksheet.autoFilter = {
      from: 'A6',
      to: `O${worksheet.rowCount}`, // En caso de añadirse o eliminarse columnas, modificar el valor 'O'
    };

    currentRow++;

    // Datos
    uebData.direcciones.forEach((direccion) => {
      worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
      worksheet.getCell(`A${currentRow}`).value = direccion.Unidad;
      worksheet.getCell(`A${currentRow}`).style = {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF0000FF' },
        },
        font: { bold: true, color: { argb: 'FFFFFFFF' } },
      };
      currentRow++;

      direccion.Area.forEach((area) => {
        worksheet.mergeCells(`A${currentRow}:O${currentRow}`);
        worksheet.getCell(`A${currentRow}`).value = area.Area;
        worksheet.getCell(`A${currentRow}`).style = {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF28A745' },
          },
          font: { color: { argb: 'FFFFFFFF' } },
        };
        currentRow++;

        area.trabs.forEach((trab) => {
          const row = worksheet.addRow({
            numero: counter++,
            nombres: trab.TrbNom || '-',
            apellido1: trab.TrbAp1 || '-',
            apellido2: trab.TrbAp2 || '-',
            sexo: trab.TrbSexo || '-',
            expediente: trab.TrbCodExp || '-',
            nivel: trab.NivEscDesc || '-',
            cargo: trab.CarDesc || '-',
            co: trab.GesCatOcup || '-',
            grupo: trab.GesCod || '-',
            total: trab.total || '-',
            escala: trab.GesSalEsc || '-',
            cla: trab.CLA || '-',
            maestria: trab['Mast/Doct'] || '-',
            otros: trab.OtrosPagos || '-',
          });

          row.eachCell((cell) => {
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
            };
            cell.alignment = { vertical: 'middle', wrapText: true };
          });
          currentRow++;
        });
      });
    });
  }

  public async generateAusentismoExcel(
    mes: string,
    year: number,
    noLabDays: number,
  ) {
    try {
      this.getBaseUri();
      // Calcular datos de ausentismo
      const ausentismoData = await this.calcularAusentismoMensual(
        mes,
        year,
        noLabDays,
      );

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ausentismo');

      // Configuración inicial de la hoja
      this.setupWorksheetStructure(worksheet, mes, year);

      // Agregar datos
      this.addMainContent(worksheet, ausentismoData);

      // Generar buffer
      return workbook.xlsx.writeBuffer();
    } catch (error) {
      throw new Error(`Error generando Excel: ${error.message}`);
    }
  }

  public async calcularAusentismoMensual(
    mes: string,
    year: number,
    diasNoLaborales: number,
  ): Promise<AusentismoData> {
    let ausentismoAnt = 0;
    let ausentAcumAnterior = 0;
    const porcientoAnterior = await this.utils.getPorcientoPeriodoAnterior(
      mes,
      year - 1,
    );

    if (porcientoAnterior.length > 0) {
      ausentismoAnt = porcientoAnterior[0].porciento;
      ausentAcumAnterior = porcientoAnterior[0].porciento_acumulado;
    } else {
      const result = await this.calcularAusentismoEspecifico(
        mes,
        year - 1,
        diasNoLaborales,
        ausentismoAnt,
        ausentAcumAnterior,
      );

      ausentismoAnt = parseFloat(
        ((result.FTNU[0] / result.FTMU[0]) * 100).toFixed(2),
      );
      ausentAcumAnterior = parseFloat(
        ((result.FTNU[1] / result.FTMU[1]) * 100).toFixed(2),
      );

      await this.utils.insertarPorcentajeAusentismo(
        mes,
        year - 1,
        ausentismoAnt,
        ausentAcumAnterior,
      );
    }

    const result = await this.calcularAusentismoEspecifico(
      mes,
      year,
      diasNoLaborales,
      ausentismoAnt,
      ausentAcumAnterior,
    );

    const ausentismoActual = parseFloat(
      ((result.FTNU[0] / result.FTMU[0]) * 100).toFixed(2),
    );
    const ausentAcumActual = parseFloat(
      ((result.FTNU[1] / result.FTMU[1]) * 100).toFixed(2),
    );

    await this.utils.insertarPorcentajeAusentismo(
      mes,
      year,
      ausentismoActual,
      ausentAcumActual,
    );

    // Resultado final
    return result;
  }

  public async calcularAusentismoEspecifico(
    mes: string,
    year: number,
    diasNoLaborales: number,
    ausentismoAnt: number,
    ausentAcumAnterior: number,
  ) {
    const diasMes = new Date(year, Number.parseInt(mes), 0).getDate();

    // Obtener datos base
    const clavesAusentismo = await this.utils.clavesAusentismo(mes, year);
    const fisicos = await this.utils.fisicosMes(mes, year);

    // 1. Fondo de Tiempo Calendario (FTC)
    const ftcReal = diasMes * fisicos;
    const ftcAcumulado =
      ftcReal + (await this.utils.conceptosAcumulados('FTC', mes, year));
    const ftc = [ftcReal, ftcAcumulado];
    await this.utils.insertarConceptosAcumulados(
      'FTC',
      'Fondo de Tiempo Calendario',
      mes,
      year,
      ftcAcumulado,
    );

    // 2. Tiempo no Laborable (TNL)
    const hombresDiasVacaciones =
      await this.utils.hombresDiasVacaciones(clavesAusentismo);
    // aquí se estaban contando los días laborables del mes (diasMes - diasNoLaborales)
    // el cálculo solo debe incluir (diasNoLaborales) para que sea correcto
    const tnlReal = diasNoLaborales * fisicos + hombresDiasVacaciones;
    const tnlAcumulado =
      tnlReal + (await this.utils.conceptosAcumulados('TNL', mes, year));
    await this.utils.insertarConceptosAcumulados(
      'TNL',
      'Tiempo no Laborable',
      mes,
      year,
      tnlAcumulado,
    );
    const tnl = [tnlReal, tnlAcumulado];

    // 3. Fondo de Tiempo Máximo Utilizable (FTMU)
    const ftmuReal = ftcReal - tnlReal;
    const ftmuAcumulado = ftcAcumulado - tnlAcumulado;
    const ftmu = [ftmuReal, ftmuAcumulado];

    // 4. Enfermedad
    const enfermedadReal = await this.utils.causasAusentismo(clavesAusentismo, [
      '09',
      '13',
    ]);
    const enfermedadAcumulado =
      enfermedadReal + (await this.utils.conceptosAcumulados('E', mes, year));
    const enfermedad = [enfermedadReal, enfermedadAcumulado];
    await this.utils.insertarConceptosAcumulados(
      'E',
      'Enfermedad',
      mes,
      year,
      enfermedadAcumulado,
    );

    // 5. Asuntos Propios
    const asuntosPropiosReal = await this.utils.causasAusentismo(
      clavesAusentismo,
      ['19', '20', '17'],
    );
    const asuntosPropiosAcumulado =
      asuntosPropiosReal +
      (await this.utils.conceptosAcumulados('AP', mes, year));
    const asuntosPropios = [asuntosPropiosReal, asuntosPropiosAcumulado];
    await this.utils.insertarConceptosAcumulados(
      'AP',
      'Asuntos Propios',
      mes,
      year,
      asuntosPropiosAcumulado,
    );

    // 6. Accidente Trabajo
    const accidenteTrabajoReal = await this.utils.causasAusentismo(
      clavesAusentismo,
      ['07', '11'],
    );
    const accidenteTrabajoAcumulado =
      accidenteTrabajoReal +
      (await this.utils.conceptosAcumulados('AT', mes, year));
    const accidenteTrabajo = [accidenteTrabajoReal, accidenteTrabajoAcumulado];
    await this.utils.insertarConceptosAcumulados(
      'AT',
      'Accidente de Trabajo',
      mes,
      year,
      accidenteTrabajoAcumulado,
    );

    // 7. Accidente Equiparado
    const accidenteEquiparadoReal = await this.utils.causasAusentismo(
      clavesAusentismo,
      ['08', '12'],
    );
    const accidenteEquiparadoAcumulado =
      accidenteEquiparadoReal +
      (await this.utils.conceptosAcumulados('AE', mes, year));
    const accidenteEquiparado = [
      accidenteEquiparadoReal,
      accidenteEquiparadoAcumulado,
    ];
    await this.utils.insertarConceptosAcumulados(
      'AE',
      'Accidente Equiparado',
      mes,
      year,
      accidenteEquiparadoAcumulado,
    );

    // 8. Ausencias Injustificadas
    const ausenciasInjustificadasReal = await this.utils.causasAusentismo(
      clavesAusentismo,
      ['16'],
    );
    const ausenciasInjustificadasAcumulado =
      ausenciasInjustificadasReal +
      (await this.utils.conceptosAcumulados('AI', mes, year));
    const ausenciasInjustificadas = [
      ausenciasInjustificadasReal,
      ausenciasInjustificadasAcumulado,
    ];
    await this.utils.insertarConceptosAcumulados(
      'AI',
      'Ausencias Injustificadas',
      mes,
      year,
      ausenciasInjustificadasAcumulado,
    );

    // 9. Fondo de Tiempo no Utilizado (FTNU)
    const ftnuReal =
      enfermedadReal +
      asuntosPropiosReal +
      accidenteTrabajoReal +
      ausenciasInjustificadasReal +
      accidenteEquiparadoReal;
    const ftnuAcumulado =
      enfermedadAcumulado +
      asuntosPropiosAcumulado +
      accidenteTrabajoAcumulado +
      accidenteEquiparadoAcumulado +
      ausenciasInjustificadasAcumulado;
    const ftnu = [ftnuReal, ftnuAcumulado];

    // 10. Fondo de Tiempo Utilizable (FTU)
    //Aquí se sumaba en lugar de restar (en los ejemplos manuales se resta)
    const ftuReal = ftmuReal - ftnuReal;
    const ftuAcumulado = ftmuAcumulado - ftnuAcumulado;
    const ftu = [ftuReal, ftuAcumulado];

    // 11. Porcentaje del Año Anterior
    const porcientoLastYear = [ausentismoAnt, ausentAcumAnterior];

    // 12. Promedios de la Tabla
    const promediosTabla = await this.utils.obtenerPromediosAusentismo(
      mes,
      year,
    );

    const result: AusentismoData = {
      FTC: ftc,
      TNL: tnl,
      FTMU: ftmu,
      FTU: ftu,
      FTNU: ftnu,
      Enfermedad: enfermedad,
      AsuntosPropios: asuntosPropios,
      AccidenteTrabajo: accidenteTrabajo,
      AccidenteEquiparado: accidenteEquiparado,
      AusenciasInjustificadas: ausenciasInjustificadas,
      PromedioTabla: promediosTabla, //Campo que no se utiliza en la versión actual del modelo
      PromedioAnterior: porcientoLastYear,
    };

    // Resultado final
    return result;
  }

  private setupWorksheetStructure(
    worksheet: ExcelJS.Worksheet,
    mes: string,
    year: number,
  ) {
    // Configurar anchos de columnas
    worksheet.columns = [
      { key: 'concepto', width: 45 },
      { key: 'real', width: 15 },
      { key: 'acumulado', width: 15 },
      { key: 'fila', width: 12 },
      { key: 'porc_mes', width: 15 },
      { key: 'porc_acumulado', width: 20 },
    ];

    // Estilos comunes
    const headerStyle = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0000FF' },
      },
      font: {
        color: { argb: 'FFFFFFFF' },
        bold: true,
      },
      alignment: { vertical: 'middle', horizontal: 'center' },
    };

    // Cabecera principal
    worksheet.mergeCells('A1:F1');
    worksheet.getCell('A1').value = 'MODELO RL4';
    worksheet.getRow(1).eachCell((cell) => Object.assign(cell, headerStyle));

    worksheet.mergeCells('A3:F3');
    worksheet.getCell('A3').value = 'Empresa: LABORATORIOS AICA';
    worksheet.getCell('A3').style = { font: { bold: true } };

    worksheet.mergeCells('A4:F4');
    worksheet.getCell('A4').value = 'GRUPO EMPRESARIAL BIOCUBAFARMA';
    worksheet.getCell('A4').style = { font: { bold: true } };

    // Fecha y mes
    worksheet.mergeCells('A5:B5');
    worksheet.getCell('A5').value = `MES QUE SE INFORMA: ${mes}`;
    worksheet.getCell('C5').value = `AÑO: ${year}`;
    worksheet.getCell('A5').style = { font: { bold: true } };
    worksheet.getCell('C5').style = { font: { bold: true } };
  }

  private addMainContent(worksheet: ExcelJS.Worksheet, data: AusentismoData) {
    let rowIndex = 7;

    // Sección Ausentismo
    worksheet.mergeCells(`A${rowIndex}:F${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value = 'AUSENTISMO';
    worksheet.getCell(`A${rowIndex}`).style = {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0000FF' },
      },
      font: { color: { argb: 'FFFFFFFF' }, bold: true },
      alignment: { vertical: 'middle', horizontal: 'center' },
    };
    rowIndex += 2;

    // Cabeceras de la tabla
    worksheet.getCell(`A${rowIndex}`).value = 'CONCEPTOS';
    worksheet.getCell(`B${rowIndex}`).value = 'REAL DEL MES';
    worksheet.getCell(`C${rowIndex}`).value = 'ACUMULADO';
    worksheet.getCell(`D${rowIndex}`).value = 'FILA NO';
    rowIndex++;

    // Función auxiliar para añadir filas
    const addRow = (concepto: string, valores: number[], fila: number) => {
      worksheet.getCell(`A${rowIndex}`).value = concepto;
      worksheet.getCell(`B${rowIndex}`).value = valores[0];
      worksheet.getCell(`C${rowIndex}`).value = valores[1];
      worksheet.getCell(`D${rowIndex}`).value = fila;

      // Calcular porcentajes si aplica
      if (fila > 5) {
        const porcentajeMes =
          ((valores[0] / data.FTMU[0]) * 100).toFixed(2) + '%';
        const porcentajeAcum =
          ((valores[1] / data.FTMU[1]) * 100).toFixed(2) + '%';

        worksheet.getCell(`E${rowIndex}`).value = porcentajeMes;
        worksheet.getCell(`F${rowIndex}`).value = porcentajeAcum;
      }

      rowIndex++;
    };

    // Añadir datos principales
    addRow('FONDO DE TIEMPO CALENDARIO', data.FTC, 1);
    addRow('Menos: TIEMPO NO LABORABLE', data.TNL, 2);
    addRow('FONDO DE TIEMPO MÁXIMO UTILIZABLE', data.FTMU, 3);
    addRow('FONDO DE TIEMPO UTILIZABLE', data.FTU, 4);
    addRow('FONDO DE TIEMPO NO UTILIZADO', data.FTNU, 5);
    addRow('*Enfermedad', data.Enfermedad, 6);
    addRow('Más * Asuntos Propios', data.AsuntosPropios, 7);
    addRow('Más * Accidente de Trabajo', data.AccidenteTrabajo, 8);
    addRow('Más * Accidente Equiparado', data.AccidenteEquiparado, 9);
    addRow('Más * Ausencias Injustificadas', data.AusenciasInjustificadas, 10);

    const mainStyle = {
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      },
      alignment: { vertical: 'middle', wrapText: true },
    };

    rowIndex -= 11;
    for (let i = rowIndex; i < rowIndex + 11; i++) {
      worksheet.getRow(i).eachCell((cell) => Object.assign(cell, mainStyle));
    }
    rowIndex += 12;

    // Añadir fórmulas finales
    const porcentajeMes =
      ((data.FTNU[0] / data.FTMU[0]) * 100).toFixed(2) + '%';
    const porcentajeAcum =
      ((data.FTNU[1] / data.FTMU[1]) * 100).toFixed(2) + '%';

    worksheet.mergeCells(`A${rowIndex}:D${rowIndex}`);
    worksheet.getCell(`A${rowIndex}`).value =
      '% AUSENTISMO DEL MES = FONDO DE TIEMPO NO UTILIZADO / FONDO DE TIEMPO MAXIMO UTILIZADO * 100';
    rowIndex++;

    worksheet.getCell(`A${rowIndex}`).value = '% AUSENTISMO DEL MES';
    worksheet.getCell(`B${rowIndex}`).value = porcentajeMes;
    rowIndex++;
    worksheet.getCell(`A${rowIndex}`).value = '% AUSENTISMO DEL MES ACUMULADO';
    worksheet.getCell(`B${rowIndex}`).value = porcentajeAcum;
    rowIndex += 2;

    // Añadir datos de año anterior
    worksheet.getCell(`A${rowIndex}`).value =
      `% AUS. IGUAL PERIODO AÑO ANTERIOR (Mes): ${data.PromedioAnterior[0]}`;
    worksheet.getCell(`C${rowIndex}`).value =
      `% AUS. IGUAL PERIODO AÑO ANTERIOR (Acumulado): ${data.PromedioAnterior[1]}`;
    rowIndex += 2;
  }

  // Exportar pdf de trabajadores interruptos

  public async getInterruptosPDF(ueb: string, fecha: string): Promise<Buffer> {
    const interruptosData =
      await this.ausenciasService.cantTrabajadoresInterruptos(
         Number(ueb),
        fecha,
      );
    return await this.generateInterruptosPDF(interruptosData, ueb, fecha);
  }

  // Exportar PDF de trabajadores interruptos dados fecha y UEB 
  async generateInterruptosPDF(
    data: any,
    ueb: string,
    fecha: string,
  ): Promise<any> {
    applyPlugin(jsPDF);
    const doc = new jsPDF('landscape');
    let yPosition = 10;

    // Estilo base
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');

    // Encabezado
    doc.setFontSize(16);
    doc.text('Trabajadores Interruptos', 14, yPosition);
    doc.setFontSize(12);
    doc.text(`Fecha: ${fecha}`, doc.internal.pageSize.width - 60, yPosition);
    yPosition += 15;

    if (data.interruptos) {
      // Caso para UEB específica
      this.addUEBSection(doc, ueb, data.interruptos, data, yPosition);
    } else {
      // Caso para todas las UEB
      yPosition = this.addUebTable(
        doc,
        data.interruptosAica,
        'AICA',
        data.totales.AICA,
        yPosition,
      );
      yPosition = this.addUebTable(
        doc,
        data.interruptosLiorad,
        'Liorad',
        data.totales.Liorad,
        yPosition,
      );
      yPosition = this.addUebTable(
        doc,
        data.interruptosJT,
        'Julio Trigo',
        data.totales.JT,
        yPosition,
      );
      yPosition = this.addUebTable(
        doc,
        data.interruptosCitox,
        'Citox',
        data.totales.CITOX,
        yPosition,
      );
      yPosition = this.addUebTable(
        doc,
        data.interruptosSH,
        'SH+',
        data.totales.SH,
        yPosition,
      );

      // Totales generales
      yPosition += 10;
      doc.setFontSize(14);
      doc.text('Totales Generales', 14, yPosition);
      yPosition += 8;
      this.addTotalTable(doc, data.totalesInt, yPosition);
    }
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    return pdfBuffer;
  }

  private addUEBSection(
    doc: jsPDF,
    ueb: string,
    interruptos: any[],
    data: any,
    y: number,
  ): number {
    doc.setFontSize(14);
    doc.text(`UEB: ${ueb}`, 14, y);
    y += 8;

    // Cabecera de tabla
    const headers = [
      'Dirección',
      'Interruptos por Covid',
      'Interruptos por Reubicación',
      'Producción 100%',
      'Producción 60%',
    ];

    // Datos
    const rows = interruptos.map((item: any) => [
      item.Direccion,
      item.covid.toString(),
      item.reubicados.toString(),
      item.produccion25.toString(),
      item.produccion48.toString(),
    ]);

    // Añadir tabla
    (doc as any).autoTable({
      startY: y,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10 },
    });

    y = (doc as any).autoTable.previous.finalY + 5;

    // Totales
    const totals = [
      [
        'Total Femenino',
        data.totalCovid.F,
        data.totalReub.F,
        data.totalProd25.F,
        data.totalProd48.F,
      ],
      [
        'Total Masculino',
        data.totalCovid.M,
        data.totalReub.M,
        data.totalProd25.M,
        data.totalProd48.M,
      ],
      [
        'Total General',
        data.totalCovid.Total,
        data.totalReub.Total,
        data.totalProd25.Total,
        data.totalProd48.Total,
      ],
    ];

    (doc as any).autoTable({
      startY: y,
      body: totals,
      theme: 'grid',
      styles: { fontSize: 10, fontStyle: 'bold' },
    });

    return (doc as any).autoTable.previous.finalY + 10;
  }

  private addUebTable(
    doc: jsPDF,
    data: any[],
    uebName: string,
    totals: any,
    y: number,
  ): number {
    doc.setFontSize(14);
    doc.text(`UEB: ${uebName}`, 14, y);
    y += 8;

    const headers = [
      'Dirección',
      'Interruptos por Covid',
      'Interruptos por Reubicación',
      'Producción 100%',
      'Producción 60%',
    ];

    const rows = data.map((item: any) => [
      item.Direccion,
      item.covid.toString(),
      item.reubicados.toString(),
      item.produccion25.toString(),
      item.produccion48.toString(),
    ]);

    (doc as any).autoTable({
      startY: y,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 10 },
    });

    y = (doc as any).autoTable.previous.finalY + 5;

    // Totales UEB
    const totalsRows = [
      [
        'Total Femenino',
        totals.Covid.F,
        totals.Reubic.F,
        totals.Prod25.F,
        totals.Prod48.F,
      ],
      [
        'Total Masculino',
        totals.Covid.M,
        totals.Reubic.M,
        totals.Prod25.M,
        totals.Prod48.M,
      ],
      [
        'Total General',
        totals.Covid.Total,
        totals.Reubic.Total,
        totals.Prod25.Total,
        totals.Prod48.Total,
      ],
    ];

    (doc as any).autoTable({
      startY: y,
      body: totalsRows,
      theme: 'grid',
      styles: { fontSize: 10, fontStyle: 'bold' },
    });

    return (doc as any).autoTable.previous.finalY + 15;
  }

  private addTotalTable(doc: jsPDF, totalesInt: any, y: number): void {
    const headers = [
      ' ',
      'Interruptos por Covid',
      'Interruptos por Reubicación',
      'Producción 100%',
      'Producción 60%',
    ];

    const totals = [
      [
        'Total Femenino',
        totalesInt.Covid.F,
        totalesInt.Reubic.F,
        totalesInt.Prod25.F,
        totalesInt.Prod48.F,
      ],
      [
        'Total Masculino',
        totalesInt.Covid.M,
        totalesInt.Reubic.M,
        totalesInt.Prod25.M,
        totalesInt.Prod48.M,
      ],
      [
        'Total General',
        totalesInt.Covid.Total,
        totalesInt.Reubic.Total,
        totalesInt.Prod25.Total,
        totalesInt.Prod48.Total,
      ],
    ];

    (doc as any).autoTable({
      startY: y,
      head: [headers],
      body: totals,
      theme: 'grid',
      styles: { fontSize: 10, fontStyle: 'bold' },
    });
  }

  // Exportar pdf de claves de ausentismo
  public async getClavesAusentismoPDF(
    codigos: string[],
    fecha: string,
    ueb: string,
  ): Promise<Buffer> {
    const interruptosData =
      await this.ausenciasService.trabPorClaves(
        codigos,
        fecha,
        ueb,
      );
    //return await this.generateClavesAusentismoPDF(interruptosData);
      return await this.generateClavesAusentismoPDF(interruptosData, fecha, ueb);
  }

  generateClavesAusentismoPDF(
  data: ClaveAusentismo[],
  fecha: string,
  ueb: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  let yPosition = 20;
  
  // Establecer estilos iniciales
  doc.setFont('helvetica');
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);

  // Título principal
  doc.text('Claves de Ausentismo', 14, yPosition);
  yPosition += 10;

  // Subtítulo con UEB y Fecha
  doc.setFontSize(11);
  doc.setTextColor(100, 100, 100); // Color gris para el subtítulo
  doc.text(`UEB: ${ueb} - Fecha: ${fecha}`, 14, yPosition);
  yPosition += 10;

  // Restablecer color para la tabla
  doc.setTextColor(0, 0, 0);

  // Configurar tabla
  const headers = ['Código claves', 'Cantidad de Trabajadores', 'Horas'];

  const rows = data.map((clave) => [
    clave.CLAVE,
    clave.CANTIDAD.toString(),
    clave.HORAS.toString(),
  ]);

  // Añadir tabla
  (doc as any).autoTable({
    startY: yPosition,
    head: [headers],
    body: rows,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 60 },
      1: { cellWidth: 60 },
      2: { cellWidth: 50 },
    },
  });

  // Generar y enviar PDF
  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  return pdfBuffer;
}

// Exportar pdf de prueba interruptos
public async getInterruptosTestPDF(): Promise<Buffer> {
  // Datos falsos proporcionados
  const fakeData = {
    interruptos: [
      {
        Direccion: "UEB Dirección",
        covid: 0,
        reubicados: 46,
        produccion25: 78,
        produccion48: 104
      }
    ],
    totalReub: { Total: 46, F: 26, M: 20 },
    totalCovid: { Total: 0, F: 0, M: 0 },
    totalProd25: { Total: 78, F: 43, M: 35 },
    totalProd48: { Total: 104, F: 64, M: 48 },
    totales: {},
    totalesInt: null
  };

  return await this.generateInterruptosPDF(fakeData, "UEB Test", "10-2025");
}






   


}
