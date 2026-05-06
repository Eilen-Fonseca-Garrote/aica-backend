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

@Injectable()
export class AusenciasService {
  private baseUri: string;
  private readonly logger = new Logger(AusenciasService.name);

  constructor(private readonly configService: ConfigService) {}
  private getBaseUri() {
    this.baseUri = this.configService.get<string>('SIGERH_BASE_PATH') as string;
    //this.utils.setBaseUri(this.baseUri);
  }

 /*  // Listar cantidad de trabajadores por clave de ausentismo
  public async listAusentismoClaves(ueb: string, fecha: string) {
    

    try {
      const trabajadores = await axios.get(
        `${this.baseUri}/recursosHumanos/ausentismoClaves?ueb=${ueb}&fecha=${fecha}`,
      );

      if (!trabajadores.data || !Array.isArray(trabajadores.data)) {
        throw new InternalServerErrorException(
          'La respuesta del servicio no es válida.',
        );
      }

      console.log(
        `Respuesta obtenida: ${JSON.stringify(trabajadores.data)}`,
      );
      return trabajadores.data;
    } catch (error) {
      console.error(
        `Error al obtener claves de ausentismo: ${error.message}`,
      );

      if (error.response) {
        throw new InternalServerErrorException(
          `Error del servicio externo: ${error.response.status} - ${error.response.data}`,
        );
      } else if (error.request) {
        throw new InternalServerErrorException(
          'No se pudo conectar al servicio externo.',
        );
      } else {
        throw new InternalServerErrorException(
          'Error inesperado: ' + error.message,
        );
      }
    }
  }
 */
  public async trabPorClaves(
    codigos: string[],
    fecha: string,
    ueb: string,
  ) {
    this.getBaseUri();
    console.log('Parámetros recibidos en trabPorClaves:', {
      codigos,
      fecha,
      ueb,
    });
    const uebName = this.getUEBByCode(ueb);
    console.log('Valor de uebName:', uebName);
    const normalizedUebName = uebName === 'Julio Trigo' ? 'JT' : uebName.toUpperCase();
    console.log('Valor de normalizedUebName:', normalizedUebName);
    const clavesCount = await this.getTrabCountClaves(codigos, fecha);
    console.log('Datos devueltos por getTrabCountClaves:', clavesCount);
    let clavesRes:any = [];
    let found = false;
    let i = 0;

    while (i < clavesCount.length && !found) {
      console.log(`Comparando: ${clavesCount[i].UEB} === ${normalizedUebName}`);
      if (clavesCount[i].UEB === normalizedUebName) {
        console.log("yep");
        found = true;
        clavesRes = clavesCount[i].CLAVES;
      }
      console.log("nope");
      i++;
    }

    console.log('Resultado final de trabPorClaves:', clavesRes);
    return clavesRes;
  }
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
  public async getTrabCountClaves(codigos: string[], fecha: string): Promise<any[]> {

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
      );

      return response.data;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error al obtener claves de ausentismo.');
    }
  }
  

  async cantTrabajadoresInterruptos(ueb: number, fecha: string): Promise<any> {
  const [mes, anno] = fecha.split('-').map((part) => parseInt(part, 10));
  this.getBaseUri();

  if (ueb === 0) {
    // ✅ Todas las UEBs en paralelo para mejor rendimiento
    const [
      [direccionesAica, direccionesLiorad, direccionesJT, direccionesCitox, direccionesSH],
      
    ] = await Promise.all([
      Promise.all([
        this.fetchDirecciones(16),
        this.fetchDirecciones(25),
        this.fetchDirecciones(55),
        this.fetchDirecciones(100),
        this.fetchDirecciones(57),
      ]),
    ]);

    const [resAica, resLiorad, resJT, resCitox, resSH] = await Promise.all([
      this.procesarUEB(16, mes, anno, direccionesAica),
      this.procesarUEB(25, mes, anno, direccionesLiorad),
      this.procesarUEB(55, mes, anno, direccionesJT),
      this.procesarUEB(100, mes, anno, direccionesCitox),
      this.procesarUEB(57, mes, anno, direccionesSH), // ✅ Fix: usaba direccionesCitox antes
    ]);

    const totales = {
      AICA:   resAica.totales,
      Liorad: resLiorad.totales,
      JT:     resJT.totales,
      CITOX:  resCitox.totales,
      SH:     resSH.totales,
    };

    // ✅ Fix: antes se sobreescribían, ahora se acumulan correctamente
    const totalReub  = this.sumarTotales([resAica.totalReub,  resLiorad.totalReub,  resJT.totalReub,  resCitox.totalReub,  resSH.totalReub]);
    const totalCovid = this.sumarTotales([resAica.totalCovid, resLiorad.totalCovid, resJT.totalCovid, resCitox.totalCovid, resSH.totalCovid]);
    const totalProd25 = this.sumarTotales([resAica.totalProd25, resLiorad.totalProd25, resJT.totalProd25, resCitox.totalProd25, resSH.totalProd25]);
    const totalProd48 = this.sumarTotales([resAica.totalProd48, resLiorad.totalProd48, resJT.totalProd48, resCitox.totalProd48, resSH.totalProd48]);

    return {
      interruptos: null,
      interruptosAica:   resAica.interruptos,
      interruptosLiorad: resLiorad.interruptos,
      interruptosJT:     resJT.interruptos,
      interruptosCitox:  resCitox.interruptos,
      interruptosSH:     resSH.interruptos,
      totalReub,
      totalCovid,
      totalProd25,
      totalProd48,
      totales,
      totalesInt: this.calcularTotalnterruptosUEB(totales),
    };
  } else {
    const direcciones = await this.fetchDirecciones(ueb);
    const res = await this.procesarUEB(ueb, mes, anno, direcciones);
    return {
      interruptos: res.interruptos,
      interruptosAica: null,
      interruptosLiorad: null,
      interruptosJT: null,
      interruptosCitox: null,
      interruptosSH: null,
      totalReub: res.totalReub,
      totalCovid: res.totalCovid,
      totalProd25: res.totalProd25,
      totalProd48: res.totalProd48,
      totales: {},
      totalesInt: null,
    };
  }
}

// ✅ Nuevo helper: suma un array de TotalResult en uno solo
private sumarTotales(totales: TotalResult[]): TotalResult {
  return totales.reduce(
    (acc, t) => ({
      Total: acc.Total + (t?.Total ?? 0),
      F: acc.F + (t?.F ?? 0),
      M: acc.M + (t?.M ?? 0),
    }),
    { Total: 0, F: 0, M: 0 },
  );
}

  // ✅ Corregido: fetchDirecciones ahora filtra entradas sin áreas para evitar filas vacías en el reporte
  private async fetchDirecciones(ueb: number): Promise<any[]> {
  try {
    const response = await axios.get(
      `${this.baseUri}/recursosHumanos/direccionesUEB?ueb=${ueb}`,
    );

    const data = response.data;
    if (!Array.isArray(data)) return [];

    // ✅ La API devuelve [{ Unidad, Area: [{EstNV1, Unidad, Area, EstNV2}] }]
    // Filtrar entradas sin áreas para no generar filas vacías en el reporte
    return data.filter((dir: any) => Array.isArray(dir.Area) && dir.Area.length > 0);
  } catch (error) {
    this.logger.error(`Error fetching direcciones para ueb=${ueb}: ${error.message}`);
    return [];
  }
}

// ✅ Corregido: 'anno' en minúscula según la API, y manejo de errores para cada fetch individual
  private async procesarUEB(
  ueb: number,
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
  // ✅ Llamadas paralelas — 'anno' en minúscula
  const [interruptosReub, interruptosCovid, interruptosProd25, interruptosProd48] =
    await Promise.all([
      this.fetchInterruptos('interruptoReubicacion', ueb, mes, anno),
      this.fetchInterruptos('interruptoCovid', ueb, mes, anno),
      this.fetchInterruptos('interrupto', ueb, mes, anno),
      this.fetchInterruptos('interrupto60', ueb, mes, anno),
    ]);

  this.logger.log(
    `UEB ${ueb}: reub=${interruptosReub.length} covid=${interruptosCovid.length} ` +
    `prod25=${interruptosProd25.length} prod48=${interruptosProd48.length}`,
  );

  const totalReub  = this.interruptosTotal(interruptosReub);
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

  // ✅ Corregido: 'anno' en minúscula según la API
private async fetchInterruptos(
  tipo: string,
  ueb: number,
  mes: number,
  anno: number,
): Promise<Interrupto[]> {
  try {
    const response = await axios.get(
      `${this.baseUri}/recursosHumanos/${tipo}?ueb=${ueb}&mes=${mes}&anno=${anno}`,
    );

    const data = response.data;
    if (!Array.isArray(data)) return [];

    // ✅ Normalizar: la API devuelve "UEB/Dirección" y puede variar entre endpoints
    return data.map((item: any) => ({
      EstNV1: item.EstNV1,
      'UEB/Dirección': (item['UEB/Dirección'] || item.direcciones || '').trim(),
      Total_Trabajadores: item.Total_Trabajadores ?? item.total ?? 0,
      Femenino: item.Femenino ?? item.femenino ?? 0,
      Masculino: item.Masculino ?? item.masculino ?? 0,
    }));
  } catch (error) {
    this.logger.error(`Error fetching ${tipo} para ueb=${ueb}: ${error.message}`);
    return []; // ✅ Devolver vacío en lugar de romper toda la cadena
  }
}

// ✅ Corregido: matching por EstNV1 numérico, no por nombre de cadena
getInterruptos(
  direcciones: any[],
  covid: Interrupto[],
  reub: Interrupto[],
  producc25: Interrupto[],
  producc48: Interrupto[],
): InterruptosEntry[] {
  const result: InterruptosEntry[] = [];

  direcciones.forEach((dir) => {
    // direccionesUEB devuelve { Unidad, Area: [{EstNV1, Area, ...}] }
    const dirName = dir.Unidad?.trim() || '';
    const areas: any[] = dir.Area || [];

    // Sumar todos los EstNV1 de las áreas de esta dirección
    let covidTotal = 0, reubTotal = 0, prod25Total = 0, prod48Total = 0;

    areas.forEach((area) => {
      const estNV1 = area.EstNV1;
      covidTotal  += this.buscarInterrupto(estNV1, covid);
      reubTotal   += this.buscarInterrupto(estNV1, reub);
      prod25Total += this.buscarInterrupto(estNV1, producc25);
      prod48Total += this.buscarInterrupto(estNV1, producc48);
    });

    result.push({
      Direccion: dirName,
      covid: covidTotal,
      reubicados: reubTotal,
      produccion25: prod25Total,
      produccion48: prod48Total,
    });
  });

  return result;
}

// ✅ Corregido: buscar por EstNV1 numérico (no por string)
buscarInterrupto(estNV1: number, intArray: Interrupto[]): number {
  const found = intArray.find((int) => Number(int.EstNV1) === Number(estNV1));
  return found ? (found.Total_Trabajadores ?? 0) : 0;
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

  
  
}
