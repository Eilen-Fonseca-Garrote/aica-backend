import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FiltersDto } from './dto/filters.dto';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import {
  Interrupto,
  InterruptosEntry,
  TotalInterruptosUEB,
  TotalResult,
} from 'src/common/types/interruptos.types';
import { ExportUtilities } from '../export/export.utility';

@Injectable()
export class AusenciasService {
  private baseUri: string;
  private readonly logger = new Logger(AusenciasService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly exportUtilities: ExportUtilities, // Inyección de ExportUtilities
  ) {}
  private getBaseUri() {
    this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
    //this.utils.setBaseUri(this.baseUri);
  }

  //Listar cantidad de trabajadores por clave de ausentismo
  public async trabPorClaves(codigos: string[], fecha: string, ueb: string) {
    this.getBaseUri();
    const uebName = this.getUEBByCode(ueb);
    const normalizedUebName =
      uebName === 'Julio Trigo' ? 'JT' : uebName.toUpperCase();
    const clavesCount = await this.getTrabCountClaves(codigos, fecha);

    let clavesRes: any = [];
    let found = false;
    let i = 0;

    while (i < clavesCount.length && !found) {
      if (clavesCount[i].UEB === normalizedUebName) {
        found = true;
        clavesRes = clavesCount[i].CLAVES;
      }
      i++;
    }

    return clavesRes;
  }

  //Obtener nombre de la UEB por el código
  private getUEBByCode(ueb: string): string {
    const uebMap: { [key: string]: string } = {
      '16': 'AICA',
      '25': 'LIORAD',
      '55': 'JT',
      '100': 'CITOX',
      '57': 'SH+',
    };
    return uebMap[ueb] || 'Unknown UEB';
  }
  public async getTrabCountClaves(
    codigos: string[],
    fecha: string,
  ): Promise<any[]> {
    const codigosJson = codigos.map((codigo) => ({ ClvCod: codigo }));
    const [mes, anno] = fecha.split('-');

    try {
      const response = await axios.post(
        `${this.baseUri}/recursosHumanos/clavesAusentismo`, // URL completa
        {
          Mes: mes,
          Anno: anno,
          Claves: codigosJson,
        },
        {
          headers: { 'Content-Type': 'application/json' }, // Encabezados
        },
      )
      return response.data;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException(
        'Error al obtener claves de ausentismo.',
      );
    }
  }

  
  // Listar trabajadores interruptos dados ueb y fecha 
async cantTrabajadoresInterruptos(ueb: string, fecha: string): Promise<any> {
    const [mes, anno] = fecha.split('-').map((part) => parseInt(part, 10));
    this.getBaseUri();

    let interruptosAica: InterruptosEntry[] | null = null;
    let interruptosLiorad: InterruptosEntry[] | null = null;
    let interruptosJT: InterruptosEntry[] | null = null;
    let interruptosCitox: InterruptosEntry[] | null = null;
    let interruptosSH: InterruptosEntry[] | null = null;
    let interruptos: InterruptosEntry[] | null = null;

    let totalReub: TotalResult = { Total: 0, F: 0, M: 0 };
    let totalCovid: TotalResult = { Total: 0, F: 0, M: 0 };
    let totalProd25: TotalResult = { Total: 0, F: 0, M: 0 };
    let totalProd48: TotalResult = { Total: 0, F: 0, M: 0 };

    const totales: { [key: string]: { [key: string]: TotalResult } } = {};
    let totalesInt: TotalInterruptosUEB | null = null;

    if (ueb === 0) {
      // Obtener direcciones para cada UEB
      const direccionesAica = await this.fetchDirecciones("16");
      const direccionesLiorad = await this.fetchDirecciones("25");
      const direccionesJT = await this.fetchDirecciones("55");
      const direccionesCitox = await this.fetchDirecciones("100");
      const direccionesSH = await this.fetchDirecciones("57");

      // Procesar AICA (UEB=16)
      const {
        interruptos: aicaInterruptos,
        totales: aicaTotales,
        ...aicaTotals
      } = await this.procesarUEB("16", mes, anno, direccionesAica);
      interruptosAica = aicaInterruptos;
      totales['AICA'] = aicaTotales;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = aicaTotals);

      // Procesar Liorad (UEB=25)
      const {
        interruptos: lioradInterruptos,
        totales: lioradTotales,
        ...lioradTotals
      } = await this.procesarUEB("25", mes, anno, direccionesLiorad);
      interruptosLiorad = lioradInterruptos;
      totales['Liorad'] = lioradTotales;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = lioradTotals);

      // Procesar JT (UEB=55)
      const {
        interruptos: jtInterruptos,
        totales: jtTotales,
        ...jtTotals
      } = await this.procesarUEB("55", mes, anno, direccionesJT);
      interruptosJT = jtInterruptos;
      totales['JT'] = jtTotales;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = jtTotals);

      // Procesar CITOX (UEB=100)
      const {
        interruptos: citoxInterruptos,
        totales: citoxTotales,
        ...citoxTotals
      } = await this.procesarUEB("100", mes, anno, direccionesCitox);
      interruptosCitox = citoxInterruptos;
      totales['CITOX'] = citoxTotales;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = citoxTotals);

      // Procesar SH (UEB=57) - Nota: Usa direccionesCitox (posible error en original)
      const {
        interruptos: shInterruptos,
        totales: shTotales,
        ...shTotals
      } = await this.procesarUEB("57", mes, anno, direccionesCitox);
      interruptosSH = shInterruptos;
      totales['SH'] = shTotales;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = shTotals);
      totalesInt = this.calcularTotalnterruptosUEB(totales);
    } else {
      const direcciones = await this.fetchDirecciones(ueb);
      const { interruptos: uebInterruptos, ...uebTotals } =
        await this.procesarUEB(ueb, mes, anno, direcciones);
      interruptos = uebInterruptos;
      ({ totalReub, totalCovid, totalProd25, totalProd48 } = uebTotals);
    }

    return {
      interruptos,
      interruptosAica,
      interruptosLiorad,
      interruptosJT,
      interruptosCitox,
      interruptosSH,
      totalReub,
      totalCovid,
      totalProd25,
      totalProd48,
      totales,
      totalesInt,
    };
  }

  private async fetchDirecciones(ueb: string): Promise<any[]> {
    const response = await axios.get(
      `${this.baseUri}/recursosHumanos/direccionesUEB?ueb=${ueb}`,
    );
    return response.data;
  }

  private async procesarUEB(
    ueb: string,
    mes: number,
    anno: number,
    direcciones: any[],
  ): Promise<{
    interruptos: InterruptosEntry[];
    totales: { [key: string]: TotalResult };
    totalReub: TotalResult;
    totalCovid: TotalResult;
    totalProd25: TotalResult;
    totalProd48: TotalResult;
  }> {
    const [
      interruptosReub,
      interruptosCovid,
      interruptosProd25,
      interruptosProd48,
    ] = await Promise.all([
      this.fetchInterruptos('interruptoReubicacion', ueb, mes, anno),
      this.fetchInterruptos('interruptoCovid', ueb, mes, anno),
      this.fetchInterruptos('interrupto', ueb, mes, anno),
      this.fetchInterruptos('interrupto60', ueb, mes, anno),
    ]);

    const totalReub = this.interruptosTotal(interruptosReub);
    const totalCovid = this.interruptosTotal(interruptosCovid);
    const totalProd25 = this.interruptosTotal(interruptosProd25);
    const totalProd48 = this.interruptosTotal(interruptosProd48);

    const interruptos = this.getInterruptos(
      direcciones,
      interruptosCovid,
      interruptosReub,
      interruptosProd25,
      interruptosProd48,
    );

    return {
      interruptos,
      totales: {
        Reubic: totalReub,
        Covid: totalCovid,
        Prod25: totalProd25,
        Prod48: totalProd48,
      },
      totalReub,
      totalCovid,
      totalProd25,
      totalProd48,
    };
  }

  private async fetchInterruptos(
    tipo: string,
    ueb: string,
    mes: number,
    anno: number,
  ): Promise<Interrupto[]> {
    const response = await axios.get(
      `${this.baseUri}/recursosHumanos/${tipo}?ueb=${ueb}&mes=${mes}&anno=${anno}`,
    );
    return response.data;
  }

  buscarInterrupto(dir: string, intArray: Interrupto[]): number {
    const found = intArray.find((int) => int.EstNV1 === dir);
    return found ? found.Total_Trabajadores : 0;
  }

  getInterruptos(
    direcciones: any[],
    covid: Interrupto[],
    reub: Interrupto[],
    producc25: Interrupto[],
    producc48: Interrupto[],
  ): InterruptosEntry[] {
    return direcciones.map((dir) => {
      const codigoDir = dir.Area?.[0]?.EstNV1 || null;
      return {
        Direccion: dir.Unidad.trim(),
        covid: this.buscarInterrupto(codigoDir, covid),
        reubicados: this.buscarInterrupto(codigoDir, reub),
        produccion25: this.buscarInterrupto(codigoDir, producc25),
        produccion48: this.buscarInterrupto(codigoDir, producc48),
      };
    });
  }

  interruptosTotal(interruptos: Interrupto[]): TotalResult {
    return interruptos.reduce(
      (acc: TotalResult, int) => {
        acc.Total += int.Total_Trabajadores;
        acc.F += int.Femenino;
        acc.M += int.Masculino;
        return acc;
      },
      { Total: 0, F: 0, M: 0 },
    );
  }

  calcularTotalnterruptosUEB(totales: {
    [key: string]: { [key: string]: TotalResult };
  }): TotalInterruptosUEB {
    const result: TotalInterruptosUEB = {
      Covid: { Total: 0, F: 0, M: 0 },
      Reubic: { Total: 0, F: 0, M: 0 },
      Prod25: { Total: 0, F: 0, M: 0 },
      Prod48: { Total: 0, F: 0, M: 0 },
    };
    Object.values(totales).forEach((uebTotal) => {
      const addToResult = (
        category: keyof TotalInterruptosUEB,
        key: string,
      ) => {
        result[category].Total += uebTotal[key].Total;
        result[category].F += uebTotal[key].F;
        result[category].M += uebTotal[key].M;
      };

      addToResult('Covid', 'Covid');
      addToResult('Reubic', 'Reubic');
      addToResult('Prod25', 'Prod25');
      addToResult('Prod48', 'Prod48');
    });

    return result;
  }



  

 

  
