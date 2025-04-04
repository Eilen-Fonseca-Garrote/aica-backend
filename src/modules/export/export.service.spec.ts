// export.service.spec.ts
import { ExportService } from './export.service';
import axios from 'axios';
import * as ExcelJS from 'exceljs';
import { ExportUtilities } from './export.utility';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import {
  DireccionModelo14B,
  TrabajadorModelo14B,
  UEBModelo14B,
} from 'src/common/types/model14b.types';
import { AusentismoData } from 'src/common/types/absenteeism.types';
import { AusenciasService } from '../ausencias/ausencias.service';

jest.mock('axios');

describe('ExportService - ExportAllWorkers', () => {
  let service: ExportService;
  let mockUtils: jest.Mocked<ExportUtilities>;
  let mockConfigService: jest.Mocked<ConfigService>;
  const mockWorkers = [
    {
      Nombre: 'Ana López',
      UEB: 'UEB Central',
      Unidad: 'Unidad Ejemplo',
      Area: 'Área Ejemplo',
      Cargo: 'Cargo Ejemplo',
      'Grp Escala': 'Grupo 1',
      NivEsc_Cargo: 'Nivel 1',
      Exp_Lab: 'EXP-001',
      CatOcup: 'Categoría A',
      Salario: 500,
      'Código Tarjeta Marcaje': 'CTM-001',
      edad: 30,
      Sexo: 'F',
      NivelEscolar: 'Universitario',
      No_Identidad: '12345678901',
      PCC: '1',
      UJC: '0',
      '1CAM-2MIN-3Otr': 'CAM',
      CumpleReq: '1',
      '1Simult-2CobDif': 'No',
      JubiladoCont: '0',
      Aut: '1',
      Imprescindible: '1',
      Defensa: 'Defensa Ejemplo',
      ColorPiel: 'Mestizo',
      Estud: '1',
      Comp: '0',
      'Graduado_de(Carrera)': 'Ingeniería',
      NoResolucion: '',
      Master_Doct: 'Master',
      'Dirección Oficial': 'Calle Falsa 123',
      Nombres: 'Ana',
      '1erApellido': 'López',
      '2doApellido': 'Pérez',
      Desig_Func: 'Designación',
      Especialidad: 'Especialidad Ejemplo',
      Talla_Camisa: 'M',
      Talla_Pantalon: '32',
      Talla_Zapato: '38',
    },
  ];

  beforeEach(() => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { Trabajadores: mockWorkers },
    });

    // Mock de ConfigService
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://fake-api.com'),
    } as any;

    // Mock de ExportUtilities
    mockUtils = {
      setBaseUri: jest.fn(),
    } as any;

    // Instancia del servicio con los mocks
    const mockAusenciasService = {} as any; // Mock for AusenciasService
    service = new ExportService(mockConfigService, mockUtils, mockAusenciasService);
  });

  it('debería generar un Excel con datos formateados', async () => {
    const buffer = await service.generateAllWorkersExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Trabajadores')!;

    // Verificar número de filas (encabezado + datos)
    expect(worksheet).toBeDefined();
    expect(worksheet.rowCount).toBe(2);

    // Validar transformación de datos
    const primeraFilaDatos = worksheet.getRow(2);
    expect(primeraFilaDatos.getCell('A').value).toBe('Ana López');
    expect(primeraFilaDatos.getCell('P').value).toBe('Sí'); // PCC: '1' → 'Sí'
    expect(primeraFilaDatos.getCell('Q').value).toBe('No'); // UJC: '0' → 'No'
    expect(primeraFilaDatos.getCell('U').value).toBe('No'); // '0' → 'No'
    expect(primeraFilaDatos.getCell('AC').value).toBe('-'); // 'null' → '-'
  });

  it('debería manejar lista vacía de trabajadores', async () => {
    (axios.get as jest.Mock).mockResolvedValue({ data: { Trabajadores: [] } });

    const buffer = await service.generateAllWorkersExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Trabajadores');
    expect(worksheet!.rowCount).toBe(1); // Solo el encabezado
  });

  it('debería manejar campos faltantes', async () => {
    const incompleteWorker = {
      ...mockWorkers[0],
      Nombre: undefined,
      PCC: null,
    };

    (axios.get as jest.Mock).mockResolvedValue({
      data: { Trabajadores: [incompleteWorker] },
    });

    const buffer = await service.generateAllWorkersExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Trabajadores')!;
    const fila = worksheet.getRow(2);

    expect(fila.getCell('A').value).toBe('-');
    expect(fila.getCell('P').value).toBe('-');
  });

  it('debería manejar 2000 trabajadores sin problemas de rendimiento', async () => {
    const massiveData = Array(2000).fill(mockWorkers);

    (axios.get as jest.Mock).mockResolvedValue({
      data: { Trabajadores: massiveData },
    });

    const start = Date.now();
    const buffer = await service.generateAllWorkersExcel();
    const duration = Date.now() - start;

    console.log(`Tiempo generación 2000 registros: ${duration}ms`);
    expect(duration).toBeLessThan(2500);
  }, 2500); // Aumentar timeout


  it('debería manejar valores booleanos no estándar', async () => {
    const invalidBooleanWorker = {
      ...mockWorkers[0],
      PCC: 'si',
      UJC: 'verdadero',
    };

    (axios.get as jest.Mock).mockResolvedValue({
      data: { Trabajadores: [invalidBooleanWorker] },
    });

    const buffer = await service.generateAllWorkersExcel();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet('Trabajadores')!;
    const fila = worksheet.getRow(2);

    expect(fila.getCell('P').value).toBe('-');
    expect(fila.getCell('Q').value).toBe('-');
  });

  it('debería manejar error de conexión con la API', async () => {
    (axios.get as jest.Mock).mockRejectedValue(
      new Error('Timeout de conexión'),
    );

    await expect(service.generateAllWorkersExcel()).rejects.toThrow(
      new InternalServerErrorException("Error al obtener datos de trabajadores"),
    );
  });

  it('debería manejar estructura de datos inválida', async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: { Trabajadores: { invalid: 'structure' } }, // Objeto en lugar de array
    });

    await expect(service.generateAllWorkersExcel()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});

describe('ExportService - Model14B', () => {
  let service: ExportService;
  let mockUtils: jest.Mocked<ExportUtilities>;
  let mockConfigService: jest.Mocked<ConfigService>;

  const mockTrabajador: TrabajadorModelo14B = {
    TrbNom: 'Laura Pérez',
    TrbAp1: 'Gómez',
    TrbAp2: 'Fernández',
    TrbSexo: 'F',
    TrbCodExp: 'EXP-14B-2023',
    NivEscDesc: 'Máster',
    CarDesc: 'Ingeniera Senior',
    GesCatOcup: 'C3',
    GesCod: 'G-14B',
    total: '2500',
    GesSalEsc: 'E-7',
    CLA: '300',
    'Mast/Doct': 'Sí',
    OtrosPagos: '150',
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://api-modelo14b.com'),
    } as any;

    mockUtils = {
      setBaseUri: jest.fn(),
      getUEBByCode: jest.fn().mockImplementation((code) => `UEB-${code}`),
    } as any;

    const mockAusenciasService = {} as any; // Mock for AusenciasService
    service = new ExportService(mockConfigService, mockUtils, mockAusenciasService);
  });

  describe('processModel14B', () => {
    it('debería manejar errores en UEBs individuales', async () => {
      // Configurar mocks para las llamadas HTTP
      jest.spyOn(axios, 'create').mockReturnValue({
        get: jest
          .fn()
          .mockImplementationOnce(() =>
            Promise.reject(new Error('Error UEB 16')),
          ) // Fallo primera UEB
          .mockImplementation((url: string) => {
            // Mock para UEBs restantes (100, 25, 55, 57)
            if (url.includes('direccionesUEB')) {
              return Promise.resolve({
                data: [
                  {
                    Unidad: 'Unidad Mock',
                    Area: [
                      { Area: 'Area Mock', trabs: [] as TrabajadorModelo14B[] },
                    ],
                  },
                ] as DireccionModelo14B[],
              });
            }
            if (url.includes('modelo14B')) {
              return Promise.resolve({ data: [] as TrabajadorModelo14B[] });
            }
          }),
      } as any);

      // Ejecutar método privado
      const result = await service['processModel14B'](axios.create());

      // Verificaciones
      expect(result.length).toBe(4); // 1 falló, 4 exitosas
      expect(mockUtils.getUEBByCode).toHaveBeenCalledWith('16'); // Verificar UEB fallida
      expect(result.every((ueb) => ueb.ueb !== 'UEB-16')).toBe(true); // Ninguna UEB-16 en el resultado
    });
  });

  describe('generateModel14BExcel', () => {
    const sampleData: UEBModelo14B[] = [
      {
        ueb: 'UEB Principal',
        direcciones: [
          {
            Unidad: 'Dirección Técnica',
            Area: [
              {
                Area: 'Desarrollo',
                trabs: [mockTrabajador],
              },
            ],
          },
        ],
      },
      {
        ueb: 'UEB Principal 2',
        direcciones: [
          {
            Unidad: 'Dirección Técnica 2',
            Area: [
              {
                Area: 'Desarrollo',
                trabs: [mockTrabajador],
              },
            ],
          },
        ],
      },
    ];

    it('debería generar una hoja por UEB', async () => {
      const buffer = await service['generateModel14BExcel'](sampleData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      expect(workbook.worksheets).toHaveLength(2);
      expect(workbook.getWorksheet('UEB Principal')).toBeDefined();
      expect(workbook.getWorksheet('UEB Principal 2')).toBeDefined();
    });

    it('debería mantener estructura con datos vacíos', async () => {
      const emptyData: UEBModelo14B[] = [
        {
          ueb: 'UEB Vacía',
          direcciones: [],
        },
      ];

      const buffer = await service['generateModel14BExcel'](emptyData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('UEB Vacía')!;
      expect(worksheet.rowCount).toBe(6); // Encabezados
      expect(worksheet.getCell('A7').value).toBeNull();
    });
  });

  describe('createModel14BSheet', () => {
    let worksheet: ExcelJS.Worksheet;

    beforeEach(() => {
      worksheet = new ExcelJS.Workbook().addWorksheet('Test Sheet');
    });

    it('debería manejar caracteres especiales', () => {
      const specialCharData: UEBModelo14B = {
        ueb: 'UEB Especial',
        direcciones: [
          {
            Unidad: 'Unidad Ñandú',
            Area: [
              {
                Area: 'Área Innovación',
                trabs: [
                  {
                    ...mockTrabajador,
                    TrbNom: 'María José Niño-Cruz',
                  },
                ],
              },
            ],
          },
        ],
      };

      service['createModel14BSheet'](worksheet, specialCharData, 7, 2023);
      const unidadCell = worksheet.getCell('A7');
      expect(unidadCell.value).toBe('Unidad Ñandú');
      expect(worksheet.getCell('B9').value).toBe('María José Niño-Cruz');
    });
  });

  // Pruebas de casos extremos
  describe('Casos Extremos', () => {
    it('debería manejar 1000 trabajadores por UEB', async () => {
      const massiveData = Array(1000).fill(mockTrabajador);
      const uebData: UEBModelo14B[] = [
        {
          ueb: 'UEB Masiva',
          direcciones: [
            {
              Unidad: 'Unidad Grande',
              Area: [
                {
                  Area: 'Área Principal',
                  trabs: massiveData,
                },
              ],
            },
          ],
        },
        {
          ueb: 'UEB Masiva 2',
          direcciones: [
            {
              Unidad: 'Unidad Grande 2',
              Area: [
                {
                  Area: 'Área Principal',
                  trabs: massiveData,
                },
              ],
            },
          ],
        },
      ];

      const start = Date.now();
      const buffer = await service['generateModel14BExcel'](uebData);
      const duration = Date.now() - start;

      console.log(`Generación de 2000 trabajadores: ${duration}ms`);
      expect(duration).toBeLessThan(2000);
    }, 2000);

    it('debería manejar datos incompletos', async () => {
      const incompleteWorker: TrabajadorModelo14B = {
        TrbNom: undefined,
        TrbAp1: null as any,
        GesCod: '',
      };

      const uebData: UEBModelo14B[] = [
        {
          ueb: 'UEB Incompleta',
          direcciones: [
            {
              Unidad: 'Unidad Test',
              Area: [
                {
                  Area: 'Área Test',
                  trabs: [incompleteWorker],
                },
              ],
            },
          ],
        },
      ];

      const buffer = await service['generateModel14BExcel'](uebData);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const dataRow = workbook.getWorksheet('UEB Incompleta')!.getRow(9);
      expect(dataRow.getCell('B').value).toBe('-');
      expect(dataRow.getCell('C').value).toBe('-');
      expect(dataRow.getCell('I').value).toBe('-');
    });
  });
});

describe('ExportService - ModeloRL4', () => {
  let service: ExportService;
  let mockUtils: jest.Mocked<ExportUtilities>;
  let mockConfigService: jest.Mocked<ConfigService>;

  // Datos mock comunes
  const mockAusentismoData: AusentismoData = {
    FTC: [1840, 5520],
    TNL: [320, 960],
    FTMU: [1520, 4560],
    FTU: [1368, 4104],
    FTNU: [152, 456],
    Enfermedad: [60, 180],
    AsuntosPropios: [40, 120],
    AccidenteTrabajo: [25, 75],
    AccidenteEquiparado: [15, 45],
    AusenciasInjustificadas: [12, 36],
    PromedioTabla: [[]],
    PromedioAnterior: [4.8, 14.4],
  };

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue('http://api-modelorl4.com'),
    } as any;

    mockUtils = {
      setBaseUri: jest.fn(),
      getPorcientoPeriodoAnterior: jest.fn(),
      clavesAusentismo: jest.fn(),
      fisicosMes: jest.fn(),
      insertarPorcentajeAusentismo: jest.fn(),
      conceptosAcumulados: jest.fn(),
      insertarConceptosAcumulados: jest.fn(),
      obtenerPromediosAusentismo: jest.fn(),
      causasAusentismo: jest.fn(),
      hombresDiasVacaciones: jest.fn(),
      getAltasBajas: jest.fn(),
    } as any;

    const mockAusenciasService = {} as any; // Mock for AusenciasService
    service = new ExportService(mockConfigService, mockUtils, mockAusenciasService);
  });

  describe('calcularAusentismoMensual', () => {
    it('debería usar porcentajes anteriores cuando existen', async () => {
      // Mock de respuesta histórica
      mockUtils.getPorcientoPeriodoAnterior.mockResolvedValue([
        {
          porciento: 4.8,
          porciento_acumulado: 14.4,
        },
      ]);

      // Mock del cálculo actual con valores controlados
      jest
        .spyOn(service as any, 'calcularAusentismoEspecifico')
        .mockResolvedValue({
          FTNU: [152, 456], // 152 / 1520 = 0.10 (10%)
          FTMU: [1520, 4560], // 456 / 4560 = 0.10 (10%)
          PromedioAnterior: [4.8, 14.4],
        });

      const result = await service['calcularAusentismoMensual']('06', 2023, 8);

      // Verificar llamada con valores precisos
      expect(mockUtils.insertarPorcentajeAusentismo).toHaveBeenCalledTimes(1);
      expect(service.calcularAusentismoEspecifico).toHaveBeenCalledTimes(1);
      expect(mockUtils.insertarPorcentajeAusentismo).toHaveBeenCalledWith(
        '06',
        2023,
        expect.closeTo(10.0, 1), // Usar closeTo para valores flotantes
        expect.closeTo(10.0, 1),
      );
      expect(service.calcularAusentismoEspecifico).toHaveBeenCalledWith(
        '06',
        2023,
        8,
        4.8,
        14.4,
      );
    });

    it('debería calcular porcentajes desde cero cuando no hay datos previos', async () => {
      mockUtils.getPorcientoPeriodoAnterior.mockResolvedValue([]);
      service.calcularAusentismoEspecifico = jest
        .fn()
        .mockResolvedValue(mockAusentismoData);

      const result = await service['calcularAusentismoMensual']('01', 2023, 10);

      expect(mockUtils.insertarPorcentajeAusentismo).toHaveBeenCalledTimes(2);
      expect(service.calcularAusentismoEspecifico).toHaveBeenCalledTimes(2);
      expect(service.calcularAusentismoEspecifico).toHaveBeenCalledWith(
        '01',
        2022,
        10,
        0,
        0,
      );
      expect(service.calcularAusentismoEspecifico).toHaveBeenCalledWith(
        '01',
        2023,
        10,
        10,
        10,
      );
      expect(
        parseFloat(((result.FTNU[0] / result.FTMU[0]) * 100).toFixed(2)),
      ).toBeCloseTo(10.0, 1);
      expect(
        parseFloat(((result.FTNU[1] / result.FTMU[1]) * 100).toFixed(2)),
      ).toBeCloseTo(10.0, 1);
    });
  });

  describe('calcularAusentismoEspecifico', () => {
    beforeEach(() => {
      mockUtils.clavesAusentismo.mockResolvedValue([
        [
          { ClvCod: '09', Cantidad: '60' },
          { ClvCod: '19', Cantidad: '40' },
        ],
      ]);
      mockUtils.fisicosMes.mockResolvedValue(100);
      mockUtils.hombresDiasVacaciones.mockReturnValue(20);
    });

    it('debería manejar errores en APIs externas', async () => {
      mockUtils.clavesAusentismo.mockRejectedValue(
        new Error('Error obteniendo claves de ausentismo'),
      );

      await expect(
        service['calcularAusentismoEspecifico']('06', 2023, 8, 4.8, 14.4),
      ).rejects.toThrow('Error obteniendo claves de ausentismo');
    });
  });

  describe('generateAusentismoExcel', () => {
    it('debería generar estructura básica del Excel', async () => {
      service.calcularAusentismoMensual = jest
        .fn()
        .mockResolvedValue(mockAusentismoData);
      const buffer = await service['generateAusentismoExcel']('06', 2023, 8);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Ausentismo')!;
      expect(worksheet).toBeDefined();
      expect(worksheet.getCell('A1').value).toBe('MODELO RL4');
      expect(worksheet.getCell("A5").value).toBe("MES QUE SE INFORMA: 06");
      expect(worksheet.getCell("C5").value).toBe("AÑO: 2023");
      expect(worksheet.columnCount).toBe(6);
      expect(worksheet.rowCount).toBe(25);
    });

    it('debería incluir todas las métricas calculadas', async () => {
      jest
        .spyOn(service as any, 'calcularAusentismoMensual')
        .mockResolvedValue(mockAusentismoData);

      const buffer = await service.generateAusentismoExcel('06', 2023, 8);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Ausentismo')!;
      expect(worksheet.getCell('B10').value).toBe(1840); // FTC Real
      expect(worksheet.getCell('B22').value).toMatch(/10.00%/); // Porcentaje mes
    });
  });

  describe('Casos Extremos', () => {
    it('debería manejar datos incompletos en el Excel', async () => {
      jest
        .spyOn(service as any, 'calcularAusentismoMensual')
        .mockResolvedValue({
          FTC: [1840, 5520],
          TNL: [320, 960],
          FTMU: [1520, 4560],
          FTU: [1368, 4104],
          FTNU: [152, 456],
          Enfermedad: [60, 180],
          AsuntosPropios: [40, 120],
          AccidenteTrabajo: [25, 75],
          AccidenteEquiparado: [15, 45],
          AusenciasInjustificadas: [12, 36],
          PromedioAnterior: [0, 0],
        } as AusentismoData);

      const buffer = await service.generateAusentismoExcel('06', 2023, 8);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet('Ausentismo')!;
      expect(worksheet.getCell('A25').value).toBe(
        '% AUS. IGUAL PERIODO AÑO ANTERIOR (Mes): 0',
      );
    });

    it('debería manejar alta concurrencia de solicitudes', async () => {
      service.calcularAusentismoMensual = jest
        .fn()
        .mockResolvedValue(mockAusentismoData);

      const parallelTests = Array(10)
        .fill(null)
        .map(async () => {
          const buffer = await service.generateAusentismoExcel('06', 2023, 8);
          expect(buffer).toBeInstanceOf(Buffer);
        });

      const start = Date.now();
      await Promise.all(parallelTests);
      const duration = Date.now() - start;

      console.log(`Tiempo de terminación: ${duration}ms`);
      expect(duration).toBeLessThan(500);
    }, 500);
  });
});


//mostrar  los pdf cde como deberia quedar
//otro pdf de como quedo

// Prueba de caja negra para la función getClavesAusentismoPDF
// Esta prueba verifica que la función genere un PDF correctamente

describe('ExportService - getClavesAusentismoPDF', () => {
  let exportService: ExportService;
  let ausenciasService: jest.Mocked<AusenciasService>;

  beforeEach(() => {
    ausenciasService = {
      trabPorClaves: jest.fn(),
    } as any;

    exportService = new ExportService(
      { get: jest.fn() } as any,
      { setBaseUri: jest.fn() } as any,
      ausenciasService,
    );
  });

  it('debería generar un PDF con las claves de ausentismo', async () => {
    const mockData = [
      { CLAVE: '09', CANTIDAD: 10, HORAS: 40 },
      { CLAVE: '19', CANTIDAD: 5, HORAS: 20 },
    ];

    ausenciasService.trabPorClaves.mockResolvedValue(mockData);

    const pdfBuffer = await exportService.getClavesAusentismoPDF(
      ['09', '19'],
      '03-2025',
      '16',
    );

    expect(ausenciasService.trabPorClaves).toHaveBeenCalledWith(
      ['09', '19'],
      '03-2025',
      '16',
    );
    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });

  it('debería manejar datos vacíos', async () => {
    ausenciasService.trabPorClaves.mockResolvedValue([]);

    const pdfBuffer = await exportService.getClavesAusentismoPDF(
      ['09', '19'],
      '03-2025',
      '16',
    );

    expect(ausenciasService.trabPorClaves).toHaveBeenCalledWith(
      ['09', '19'],
      '03-2025',
      '16',
    );
    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });

  it('debería lanzar un error si el servicio falla', async () => {
    ausenciasService.trabPorClaves.mockRejectedValue(
      new Error('Error en el servicio'),
    );

    await expect(
      exportService.getClavesAusentismoPDF(['09', '19'], '03-2025', '16'),
    ).rejects.toThrow('Error en el servicio');
  });
});

// Pruebas de caja negra para la función generateInterruptosPDF
describe('ExportService - generateInterruptosPDF', () => {
  let exportService: ExportService;

  beforeEach(() => {
    exportService = new ExportService(
      { get: jest.fn() } as any,
      { setBaseUri: jest.fn() } as any,
      {} as any,
    );
  });

  it('debería generar un PDF con los datos de trabajadores interruptos', async () => {
    const mockData = {
      interruptos: [
        {
          Direccion: 'Dirección 1',
          covid: 10,
          reubicados: 5,
          produccion25: 3,
          produccion48: 2,
        },
      ],
      totalCovid: { F: 5, M: 5, Total: 10 },
      totalReub: { F: 3, M: 2, Total: 5 },
      totalProd25: { F: 2, M: 1, Total: 3 },
      totalProd48: { F: 1, M: 1, Total: 2 },
    };

    const pdfBuffer = await exportService.generateInterruptosPDF(
      mockData,
      '16',
      '03-2025',
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });

  it('debería manejar datos vacíos', async () => {
    const mockData = {
      interruptos: [],
      totalCovid: { F: 0, M: 0, Total: 0 },
      totalReub: { F: 0, M: 0, Total: 0 },
      totalProd25: { F: 0, M: 0, Total: 0 },
      totalProd48: { F: 0, M: 0, Total: 0 },
    };

    const pdfBuffer = await exportService.generateInterruptosPDF(
      mockData,
      '16',
      '03-2025',
    );

    expect(pdfBuffer).toBeInstanceOf(Buffer);
  });

  it('debería lanzar un error si los datos son inválidos', async () => {
    const invalidData = null;

    await expect(
      exportService.generateInterruptosPDF(invalidData, '16', '03-2025'),
    ).rejects.toThrow();
  });
});