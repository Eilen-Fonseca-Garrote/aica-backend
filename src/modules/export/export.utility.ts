import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import axios from 'axios';

@Injectable()
export class ExportUtilities {
  private baseUri: string;
  private fuentePrimariaData: Record<string, any> = [];
  private isDataLoaded = false;
  private readonly uebs = ['16', '25', '55', '57', '100'];
  private readonly meses = [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
  ];

  constructor(private readonly entityManager: EntityManager) {}


  //Esta función es puramente informativa, para comprobar los resultados de los enpoints
  //Sus llamadas en los métodos deberían estar comentadas si llegan a producción para ahorrar recursos
  private mockFunction(resultados: any, name: string) {
    // Guardar mock (descomentar para generar JSON)
    const fs = require('fs');
    const path = require('path');
    const mockDir = 'src/data/modelorl4'; //modificar la ruta para su función específica
    const mockPath = path.join(mockDir, name);
    fs.writeFileSync(mockPath, JSON.stringify(resultados, null, 2));
  }

  setBaseUri(base) {
    this.baseUri = base;
  }

  public async getUEBByCode(code: string): Promise<string> {
    if (code == '16') return 'AICA';
    else if (code == '55') return 'Julio Trigo';
    else if (code == '25') return 'Liorad';
    else if (code == '57') return 'SH+';
    else return 'CITOX';
  }

  public async insertarPorcentajeAusentismo(
    mes: string,
    anno: number,
    ausentismoAnt: number,
    ausentAcumAnterior: number,
  ): Promise<string> {
    try {
      const query = `
        SELECT * 
        FROM porciento_ausentismo 
        WHERE mes = ? AND anno = ?
      `;

      const parameters = [mes, anno];

      const resultados = await this.entityManager.query(query, parameters);

      if (resultados.length === 0) {
        const insertQuery = `
          INSERT INTO porciento_ausentismo (mes, anno, porciento, porciento_acumulado) VALUES (?, ?, ?, ?)
        `;

        const insertParameters = [mes, anno, ausentismoAnt, ausentAcumAnterior];
        await this.entityManager.query(insertQuery, insertParameters);
      }

      return 'Success';
    } catch (error) {
      console.error('Error inserting porciento de ausentismo:', error);
      return 'Error';
    }
  }

  async getPorcientoPeriodoAnterior(mes: string, anno: number): Promise<any[]> {
    try {
      const query = `
        SELECT * 
        FROM porciento_ausentismo 
        WHERE mes = ? AND anno = ?
      `;

      const parameters = [mes, anno];

      const resultados = await this.entityManager.query(query, parameters);

      //this.mockFunction(resultados, `porciento-ausentismo-${anno}-${mes}.json`);

      return resultados;
    } catch (error) {
      throw new Error(`Error en getPorcientoPeriodoAnterior: ${error.message}`);
    }
  }

  async clavesAusentismo(mes: string, year: number): Promise<any[]> {
    try {
      const uebs = this.construirArregloUebs();
      const result: any[] = [];

      for (const ueb of uebs) {
        try {
          const url = `${this.baseUri}/recursosHumanos/totalClavesDescuentan`;
          const params = {
            anno: year,
            mes: Number.parseInt(mes),
            ueb: ueb.codigo,
          };

          const { data } = await axios.get(url, { params });
          /* this.mockFunction(
            data,
            `totalClavesDescuentan-${year}-${mes}-${ueb.codigo}.json`,
          ); */
          result.push(data);
        } catch (error) {
          console.error(
            `Error obteniendo claves para UEB ${ueb.ueb}:`,
            error.message,
          );
          // Continuar con la siguiente UEB en caso de error
          continue;
        }
      }

      return result;
    } catch (error) {
      console.error('Error en clavesAusentismo:', error.message);
      throw new Error('Error obteniendo claves de ausentismo');
    }
  }

  private construirArregloUebs(): { ueb: string; codigo: string }[] {
    return [
      { ueb: 'Aica', codigo: '16' },
      { ueb: 'Liorad', codigo: '25' },
      { ueb: 'JT', codigo: '55' },
      { ueb: 'Citox', codigo: '100' },
      { ueb: 'SH', codigo: '57' },
    ];
  }

  async fisicosMes(mes: string, anno: number): Promise<number> {
    const clave26 = await this.getPromedioByClaveId('26');
    if (mes === '12') {
      anno -= 1;
    }
    const fuente = await this.obtenerFuentePrimaria();
    const promedioTotal = await this.calcularPromedioGeneral(
      clave26[0],
      mes,
      anno,
      `${mes}-${anno}`,
      fuente,
    );
    return promedioTotal.totdasUEB.totalFisico; //se escogia la posicion 6
  }

  async getPromedioByClaveId(id: string): Promise<any[]> {
    const rows = await this.entityManager.query(
      'SELECT * FROM promedio WHERE clave = ?',
      [id],
    );
    //this.mockFunction(rows, `PromedioByClaveId-${id}.json`);
    return rows;
  }

  async obtenerFuentePrimaria(
    entidad: number = 1,
  ): Promise<Record<string, any>> {
    if (!this.isDataLoaded) {
      await this.cargarFuentePrimaria(entidad);
    }
    return this.fuentePrimariaData;
  }

  private async cargarFuentePrimaria(
    entidad: number = 1,
  ): Promise<Record<string, any>> {
    try {
      const { data } = await axios.get(
        `${this.baseUri}/fuente_primaria/laboratorios`,
        {
          params: { entidad },
        },
      );

      const fuentePrimariaSvc = data;

      for (const fc of fuentePrimariaSvc) {
        const ueb = fc.nombre;
        const codigo = fc.codigo;

        this.fuentePrimariaData[ueb] = {
          codigo: codigo,
          diminutivo: this.getDiminutivo(ueb),
          direccion: this.getDireccion(ueb),
        };
      }

      this.isDataLoaded = true;

      return this.fuentePrimariaData;
    } catch (error) {
      console.error('Error en fuente primaria atiende a este:', error.message);
      throw new Error('Error obteniendo datos de fuente primaria');
    }
  }

  private getDiminutivo(ueb: string): string {
    const mapping: Record<string, string> = {
      LIORAD: 'Liorad',
      'JULIO TRIGO': 'JT',
      CITOSTÁTICOS: 'CITOX',
      'SH+': 'SH',
      AICA: 'AICA',
    };
    return mapping[ueb] || ueb;
  }

  private getDireccion(ueb: string): string | undefined {
    const direcciones: Record<string, string> = {
      LIORAD: '276',
      'JULIO TRIGO': '287',
      CITOSTÁTICOS: '285',
      'SH+': '302',
    };
    return direcciones[ueb];
  }

  async calcularPromedioGeneral(
    clave26: any,
    mes: string,
    anno: number,
    fecha: string,
    fuente_primaria: any,
  ): Promise<any> {
    let total = [];
    const promedio_general = [];
    let indice = 0;

    for (const ueb in fuente_primaria) {
      const fc = fuente_primaria[ueb];
      const codigo = fc['codigo'];
      let clave26Param = false;

      if (clave26.restar === 1) {
        const response = await axios.get(
          `${this.baseUri}/recursosHumanos/bajaTrab`,
          {
            params: { ueb: codigo, mes: mes, anno },
          },
        );
        //this.mockFunction(response.data, `bajaTrab-${ueb}-${anno}-${mes}.json`);
        clave26Param = response.data;
      }

      promedio_general[ueb] = [];
      const direccion = fc['direccion'] || '%%';
      const response = await axios.get(
        `${this.baseUri}/recursosHumanos/promTrabajadores`,
        {
          params: { ueb: codigo, direccion, mes, anno },
        },
      );
      /* this.mockFunction(
        response.data,
        `promTrabajadores-${codigo}-${mes}-${anno}-${direccion}.json`,
      ); */
      promedio_general[ueb].promedio = response.data;

      total = this.addTotalPromedioMensual(
        promedio_general[ueb].promedio,
        indice,
        total,
        clave26Param,
      );
      indice++;
    }

    promedio_general['total'] = total;
    promedio_general['totdasUEB'] = this.calcTotalTodasUEB(total);
    return promedio_general;
  }

  addTotalPromedioMensual(
    promedio: any,
    indice: number,
    resultado: any,
    inicio = false,
  ): any {
    let totalFisico = 0;
    let totalFisicoMuj = 0;
    let totalPromedio = 0;
    let totalPromedioMujeres = 0;

    if (inicio) {
      /* promedio.forEach((promArray: any) => {
        console.log(`promArray en addTotalPomedioMensual: ${promArray}`);
        promArray.forEach((prom: any) => {
          totalFisico += prom.HPromFisic;
          totalFisicoMuj += prom.HPromFMuj;
          totalPromedio += prom.HPromTot;
          totalPromedioMujeres += prom.HPromMuj;
        });
      });  */
      promedio.forEach((promArray: any) => {
        totalFisico += promArray.HPromFisic;
        totalFisicoMuj += promArray.HPromFMuj;
        totalPromedio += promArray.HPromTot;
        totalPromedioMujeres += promArray.HPromMuj;
      });
    } else {
      promedio.forEach((prom: any) => {
        totalFisico += prom.HPromFisic;
        totalFisicoMuj += prom.HPromFMuj;
        totalPromedio += prom.HPromTot;
        totalPromedioMujeres += prom.HPromMuj;
      });
    }

    resultado[indice] = {
      totalFisico,
      totalFisicoMuj,
      totalPromedio,
      totalPromedioMujeres,
    };
    return resultado;
  }

  calcTotalTodasUEB(totales: any): any {
    let totalFisico = 0;
    let totalFisicoMuj = 0;
    let totalPromedio = 0;
    let totalPromedioMujeres = 0;

    totales.forEach((total: any) => {
      totalFisico += total.totalFisico;
      totalFisicoMuj += total.totalFisicoMuj;
      totalPromedio += total.totalPromedio;
      totalPromedioMujeres += total.totalPromedioMujeres;
    });

    return {
      totalFisico,
      totalFisicoMuj,
      totalPromedio,
      totalPromedioMujeres,
    };
  }

  async conceptosAcumulados(
    concepto: string,
    mes: string,
    year: number,
  ): Promise<number> {
    try {
      // Si es enero, retornar 0
      if (mes === '01') {
        return 0;
      }

      // Convertir mes a número y restar 1
      let mesAnterior = parseInt(mes, 10) - 1;

      // Formatear mes a dos dígitos
      const mesFormateado =
        mesAnterior < 10 ? `0${mesAnterior}` : mesAnterior.toString();

      // Consulta a la base de datos
      const query = `
        SELECT valor 
        FROM conceptos_mensuales 
        WHERE concepto = ? 
          AND mes = ? 
          AND anno = ?
      `;

      const params = [concepto, mesFormateado, year];

      const resultados = await this.entityManager.query(query, params);
      /* this.mockFunction(
        resultados,
        `valor-concepto_mensual-${concepto}-${year}-${mes}.json`,
      ); */

      // Si no hay resultados, retornar 0
      if (!resultados || resultados.length === 0) {
        return 0;
      }

      // Retornar el valor del concepto
      return parseFloat(resultados[0].valor);
    } catch (error) {
      console.error('Error en conceptosAcumulados:', {
        concepto,
        mes,
        year,
        error: error.message,
      });
      throw new Error(`Error obteniendo concepto acumulado: ${error.message}`);
    }
  }

  async insertarConceptosAcumulados(
    concepto: string,
    descripcion: string,
    mes: string,
    anno: number,
    valor: number,
  ): Promise<string> {
    try {
      const query = `
        SELECT * FROM conceptos_mensuales WHERE concepto = ? AND mes = ? AND anno = ?
      `;

      const parameters = [concepto, mes, anno];
      const result = await this.entityManager.query(query, parameters);
      /* this.mockFunction(
        result,
        `concepto_mensual-${concepto}-${anno}-${mes}.json`,
      ); */

      if (result.length === 0) {
        const insertQuery = `
          INSERT INTO conceptos_mensuales (concepto, concepto_desc, mes, anno, valor) VALUES (?, ?, ?, ?, ?)
        `;

        const insertParameters = [concepto, descripcion, mes, anno, valor];
        await this.entityManager.query(insertQuery, insertParameters);
      }

      return 'Success';
    } catch (error) {
      console.error('Error inserting conceptos acumulados:', error);
      return 'Error';
    }
  }

  hombresDiasVacaciones(claves: any[]): number {
    let totalHoras = 0;

    for (const cl of claves) {
      for (const clUeb of cl) {
        if (clUeb['ClvCod'] === '01') {
          totalHoras += parseFloat(clUeb['Cantidad']);
        }
      }
    }

    return totalHoras / 8;
  }

  causasAusentismo(
    clavesAusentismoGeneral: any[],
    clavesAsociadas: string[],
  ): number {
    let total = 0;

    for (const claveCausa of clavesAsociadas) {
      for (const claveUeb of clavesAusentismoGeneral) {
        for (const cl of claveUeb) {
          if (cl['ClvCod'] === claveCausa) {
            total += parseFloat(cl['Cantidad']);
          }
        }
      }
    }

    return total;
  }

  // AltasBajasGeneral
  async getAltasBajas(mes: string, anno: number): Promise<[number, number]> {
    let altasTotal = 0;
    let bajasTotal = 0;

    try {
      for (const ueb of this.uebs) {
        const [altas, bajas] = await Promise.all([
          this.fetchAltas(mes, anno, ueb),
          this.fetchBajas(mes, anno, ueb),
        ]);

        altasTotal += altas;
        bajasTotal += bajas;
      }
    } catch (error) {
      console.error('Error en altas/bajas:', error);
      throw new Error('Error obteniendo datos de altas y bajas');
    }

    return [altasTotal, bajasTotal];
  }

  private async fetchAltas(
    mes: string,
    anno: number,
    ueb: string,
  ): Promise<number> {
    try {
      const { data } = await axios.get(
        `${process.env.SIGERH_BASE_PATH}/recursosHumanos/cantidadAltas`,
        {
          params: { anno, mes, ueb },
        },
      );
      //this.mockFunction(data, `cantidadAltas-${anno}-${mes}-${ueb}.json`);
      return data[0]?.altas || 0;
    } catch (error) {
      console.error(`Error altas UEB ${ueb}:`, error.message);
      return 0;
    }
  }

  private async fetchBajas(
    mes: string,
    anno: number,
    ueb: string,
  ): Promise<number> {
    try {
      const { data } = await axios.get(
        `${process.env.SIGERH_BASE_PATH}/recursosHumanos/cantidadBajas`,
        {
          params: { anno, mes, ueb },
        },
      );
      //this.mockFunction(data, `cantidadBajas-${anno}-${mes}-${ueb}.json`);
      return data[0]?.bajas || 0;
    } catch (error) {
      console.error(`Error bajas UEB ${ueb}:`, error.message);
      return 0;
    }
  }

  // InsertarPromedioActual
  async insertarPromedioActual(
    promedioArray: any,
    mes: string,
    anno: number,
  ): Promise<void> {
    const { promedioAnterior, altasBajas, promedio, promedioAcumulado } =
      promedioArray;

    const insertQuery = `
      INSERT INTO promedios_ausentismo 
      (mes, anno, fisicos_anterior, altas, bajas, fisicos_actual, promedio_anterior, promedio_actual, promedio_acumulado)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      mes,
      anno,
      promedioAnterior[6]?.totalFisico || 0,
      altasBajas[0],
      altasBajas[1],
      promedio[6]?.totalFisico || 0,
      promedioAnterior[6]?.totalPromedio || 0,
      promedio[6]?.totalPromedio || 0,
      promedioAcumulado,
    ];

    try {
      await this.entityManager.query(insertQuery, params);
    } catch (error) {
      console.error('Error insertando promedio:', error);
      throw new Error('Error al guardar promedio');
    }
  }

  // PromediosAusentismo
  async obtenerPromediosAusentismo(mes: string, anno: number): Promise<any[]> {
    const result: any[] = [];
    let stop = false;

    try {
      // Verificar e insertar promedio actual
      const promedioActual = await this.promedioAusentismoActual(
        mes,
        anno,
        `${mes}-${anno}`,
      );

      if (!promedioActual.exist) {
        await this.insertarPromedioActual(promedioActual, mes, anno);
      }

      // Obtener datos históricos
      for (const mesActual of this.meses) {
        if (stop) break;

        const selectQuery = `
          SELECT * 
          FROM promedios_ausentismo 
          WHERE mes = ? AND anno = ?
        `;

        const prom = await this.entityManager.query(selectQuery, [
          mesActual,
          anno,
        ]);
        //this.mockFunction(prom, `promedios_ausentismo-${anno}-${mes}.json`);
        result.push(prom);

        if (mesActual === mes) stop = true;
      }
    } catch (error) {
      console.error('Error obteniendo promedios:', error);
      throw new Error('Error en cálculo de promedios');
    }

    return result;
  }

  async promedioAusentismoActual(
    mes: string,
    anno: number,
    fecha: string,
  ): Promise<any> {
    try {
      // 1. Verificar si ya existe en la base de datos
      // no se comprobaba el año también
      const selectQuery = `
        SELECT * 
        FROM promedios_ausentismo 
        WHERE mes = ? AND anno = ?
      `;

      const resultados = await this.entityManager.query(selectQuery, [mes, anno]);
      //this.mockFunction(resultados, `promedios_ausentismo-${anno}-${mes}.json`);

      if (resultados.length > 0) {
        return {
          promedio: resultados[0].promedio_actual,
          altasBajas: [resultados[0].altas, resultados[0].bajas],
          promedioAnterior: resultados[0].promedio_anterior,
          promedioAcumulado: resultados[0].promedio_acumulado,
          exist: true,
        };
      }

      // 2. Si no existe, calcular los valores
      const clave26 = await this.getPromedioByClaveId('26');
      const fuente = await this.obtenerFuentePrimaria();
      const promedio = await this.calcularPromedioGeneral(
        clave26[0],
        mes,
        anno,
        fecha,
        fuente,
      );
      const altasBajas = await this.getAltasBajas(mes, anno);

      let promedioAnterior: any;
      let promedioAcumulado: number;

      if (mes === '01') {
        const fechaAnterior = `12-${anno - 1}`;
        promedioAnterior = await this.calcularPromedioGeneral(
          clave26[0],
          '12',
          anno - 1,
          fechaAnterior,
          fuente,
        );
        promedioAcumulado = promedioAnterior.totdasUEB.totalPromedio;
      } else {
        const mesAnterior = (parseInt(mes, 10) - 1).toString().padStart(2, '0');
        const fechaActual = `${mesAnterior}-${anno}`;
        promedioAnterior = await this.calcularPromedioGeneral(
          clave26[0],
          mesAnterior,
          anno,
          fechaActual,
          fuente,
        );

        promedioAcumulado =
          promedioAnterior.totdasUEB.totalPromedio +
          promedio.totdasUEB.totalPromedio;
      }

      return {
        promedio,
        altasBajas,
        promedioAnterior,
        promedioAcumulado,
        exist: false,
      };
    } catch (error) {
      console.error('Error en promedioAusentismoActual:', error.message);
      throw new Error('Error calculando promedio actual');
    }
  }
}
