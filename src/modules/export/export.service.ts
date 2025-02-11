// export.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { existsSync, mkdirSync } from 'fs';

@Injectable()
export class ExportService {
  constructor(
    private readonly configService: ConfigService,
  ) {}

  getBaseUri(): string {
    return this.configService.get<string>('SIGERH_BASE_PATH') as string;
  }

  async getTrabajadores(baseUri: string): Promise<any[]> {
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
      const trabajadores = await this.getTrabajadores(baseUri);

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
}
