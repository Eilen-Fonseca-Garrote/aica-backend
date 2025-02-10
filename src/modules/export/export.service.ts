// trabajadores.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { createReadStream, existsSync, mkdirSync, rmSync } from 'fs';

@Injectable()
export class ExportService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  getBaseUri(): string {
    return this.configService.get<string>('SIGERH_BASE_PATH') as string;
  }

  async getTrabajadores(baseUri: string): Promise<any[]> {
    try {
      const { data } = await axios.get(`${baseUri}/trabVillar`);
      console.log(data);
      return data.Trabajadores || [];
    } catch (error) {
      throw new Error('Error al obtener datos de trabajadores');
    }
  }

  async generateAllWorkersExcel() {
    try {
      const baseUri = this.getBaseUri();
      const trabajadores = await this.getTrabajadores(baseUri);

      
      if (!existsSync('temp')) mkdirSync('temp');
      const date = new Date();
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Trabajadores');

      // Definir columnas con anchos personalizados
      worksheet.columns = [
        { header: 'Nombre y Apellidos', key: 'nombreCompleto', width: 30 },
        { header: 'UEB', key: 'ueb', width: 20 },
        { header: 'Unidad', key: 'unidad', width: 20 },
        { header: 'Área', key: 'area', width: 20 },
        { header: 'Cargo', key: 'cargo', width: 20 },
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
        { header: 'Graduado de', key: 'graduadoDe', width: 20 },
        { header: 'No Resolución', key: 'noResolucion', width: 20 },
        { header: 'Master-Doct', key: 'masterDoct', width: 20 },
        { header: 'Dirección', key: 'direccion', width: 30 },
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

      // Agregar datos de trabajadores
      trabajadores.forEach((trabajador) => {
        const row = worksheet.addRow({
          nombreCompleto: trabajador.nombreCompleto,
          ueb: trabajador.ueb,
          unidad: trabajador.unidad,
          area: trabajador.area,
          cargo: trabajador.cargo,
          grupoEscala: trabajador.grupoEscala,
          nivelEscolarCargo: trabajador.nivelEscolarCargo,
          expedienteLaboral: trabajador.expedienteLaboral,
          categoriaOcupacional: trabajador.categoriaOcupacional,
          salario: trabajador.salario,
          codigoMarcaje: trabajador.codigoMarcaje,
          edad: trabajador.edad,
          sexo: trabajador.sexo,
          nivelEscolar: trabajador.nivelEscolar,
          noIdentidad: trabajador.noIdentidad,
          pcc: trabajador.pcc,
          ujc: trabajador.ujc,
          camMinOtr: trabajador.camMinOtr,
          cumpleReq: trabajador.cumpleReq,
          simultCobDif: trabajador.simultCobDif,
          jubiladoCont: trabajador.jubiladoCont,
          tieneAuto: trabajador.tieneAuto,
          imprescindible: trabajador.imprescindible,
          trbUbicDefensa: trabajador.trbUbicDefensa,
          colorPiel: trabajador.colorPiel,
          estud: trabajador.estud,
          comp: trabajador.comp,
          graduadoDe: trabajador.graduadoDe,
          noResolucion: trabajador.noResolucion,
          masterDoct: trabajador.masterDoct,
          direccion: trabajador.direccion,
          nombres: trabajador.nombres,
          apellido1: trabajador.apellido1,
          apellido2: trabajador.apellido2,
          desigFunc: trabajador.desigFunc,
          especialidad: trabajador.especialidad,
          tallaCamisa: trabajador.tallaCamisa,
          tallaPantalon: trabajador.tallaPantalon,
          tallaZapato: trabajador.tallaZapato,
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
        to: `${worksheet.columnCount}${worksheet.rowCount}`,
      };

      // Generar buffer en memoria
      const objName = `temp/${trabajadores}-${date.getTime()}.xlsx`;
      await workbook.xlsx.writeFile(objName);

      if (!objName) throw new Error('File not created');

      const readStream = createReadStream(objName);
      readStream.on('end', () => {
        rmSync(objName);
      });
      return readStream;
    } catch (error) {
      throw new InternalServerErrorException('Error al generar el reporte');
    }
  }
}
