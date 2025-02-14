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

@Injectable()
export class ExportService {
  constructor(private readonly configService: ConfigService) {}

  getBaseUri(): string {
    return this.configService.get<string>('SIGERH_BASE_PATH') as string;
  }

  async getWorkers(baseUri: string): Promise<any[]> {
    try {
      const { data } = await axios.get(`${baseUri}/trabVillar`);
      return data.Trabajadores || [];
    } catch (error) {
      console.error('Error en getTrabajadores:', error);
      throw new Error('Error al obtener datos de trabajadores');
    }
  }

  async generateAllWorkersExcel() {
    try {
      const baseUri = this.getBaseUri();
      const trabajadores = await this.getWorkers(baseUri);

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

  async exportModel14B() {
    try {
      const baseUri = this.getBaseUri();
      const client = axios.create({ baseURL: baseUri });

      const model14B_apart = await this.processModelo14B(client);
      const buffer = await this.generateModel14BExcel(model14B_apart);

      return buffer;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  private async processModelo14B(client: any): Promise<UEBModelo14B[]> {
    const uebs = ['16', '100', '25', '55', '57'];
    const result: UEBModelo14B[] = [];

    for (const ueb of uebs) {
      try {
        const uebName = await this.getUEBByCode(ueb);
        const UEBModelo14B: UEBModelo14B = { ueb: uebName, direcciones: [] };

        const [direcciones, modelo14B] = await Promise.all([
          client.get(`/recursosHumanos/direccionesUEB?ueb=${ueb}`),
          client.get(`/recursosHumanos/modelo14B?ueb=${ueb}`),
        ]);  //original

        const direccionesData: DireccionModelo14B[] = direcciones.data 
          .map((dir: any) => ({
            Unidad: dir.Unidad.trim(),
            Area: dir.Area.map((area: any) => ({
              Area: area.Area.trim(),
              trabs: modelo14B.data
                .filter(
                  (trab: any) =>
                    dir.Unidad.trim() === trab.EstDesc.trim() &&
                    area.Area.trim() === trab.Expr1.trim(),
                ),
            })),
          }));

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

  private async getUEBByCode(code: string): Promise<string> {
    if (code == '16') return 'AICA';
    else if (code == '55') return 'Julio Trigo';
    else if (code == '25') return 'Liorad';
    else if (code == '57') return 'SH+';
    else return 'CITOX';
  }
}
