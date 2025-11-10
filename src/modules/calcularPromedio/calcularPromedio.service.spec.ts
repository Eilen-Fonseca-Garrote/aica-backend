import { Test, TestingModule } from '@nestjs/testing';
import { CalcularPromedioService } from './calcularPromedio.service';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from 'typeorm';
import axios from 'axios';
import { InternalServerErrorException } from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CalcularPromedioService', () => {
  let service: CalcularPromedioService;
  let configService: jest.Mocked<ConfigService>;
  const mockEntityManager = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalcularPromedioService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://mock-api-url'),
          },
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<CalcularPromedioService>(CalcularPromedioService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBaseUri', () => {
    it('should set baseUri from config service', () => {
      expect(configService.get).toHaveBeenCalledWith('SIGERH_BASE_PATH');
      expect(service['baseUri']).toBe('http://mock-api-url');
    });
  });

  describe('getPromedioMensual', () => {
    it('should handle UEB 0 case', async () => {
      jest.spyOn(service as any, 'getPromedioByClaveId').mockResolvedValue([{ restar: 1 }]);
      jest.spyOn(service as any, 'getFuentePrimaria').mockResolvedValue({
        'AICA': { codigo: '16', direccion: '', diminutivo: 'AICA' },
        'LIORAD': { codigo: '25', direccion: '276', diminutivo: 'Liorad' },
        'CITOSTÁTICOS': { codigo: '100', direccion: '285', diminutivo: 'CITOX' },
        'JULIO TRIGO': { codigo: '55', direccion: '287', diminutivo: 'JT' },
        'SH+': { codigo: '57', direccion: '302', diminutivo: 'SH' },
      });
      jest.spyOn(service as any, 'calcularPromedioGeneral').mockResolvedValue({
        'AICA': { promedio: { HPromTot: 100, HPromMuj: 50 } },
        'LIORAD': { promedio: { HPromTot: 200, HPromMuj: 100 } },
        'CITOSTÁTICOS': { promedio: { HPromTot: 150, HPromMuj: 75 } },
        'JULIO TRIGO': { promedio: { HPromTot: 120, HPromMuj: 60 } },
        'SH+': { promedio: { HPromTot: 80, HPromMuj: 40 } },
        total: [{ totalPromedio: 650, totalPromedioMujeres: 325 }],
        todasUEB: { totalPromedio: 650, totalPromedioMujeres: 325 }
      });

      const result = await service.getPromedioMensual('0', '8-2020');

      expect(result).toEqual({
        promedio: null,
        promedioAica: { HPromTot: 100, HPromMuj: 50 },
        promedioLiorad: { HPromTot: 200, HPromMuj: 100 },
        promedioCitox: { HPromTot: 150, HPromMuj: 75 },
        promedioJT: { HPromTot: 120, HPromMuj: 60 },
        promedioSH: { HPromTot: 80, HPromMuj: 40 },
        total: [{ totalPromedio: 650, totalPromedioMujeres: 325 }],
        todasUeb: { totalPromedio: 650, totalPromedioMujeres: 325 },
        clave26: 1
      });
    });

    it('should handle specific UEB case (25)', async () => {
      jest.spyOn(service as any, 'getPromedioByClaveId').mockResolvedValue([{ restar: 0 }]);
      jest.spyOn(service as any, 'getBajaTrab').mockResolvedValue([]);
      jest.spyOn(service as any, 'getPromTrabajadores').mockResolvedValue([
        { HPromFisic: 100, HPromFMuj: 50, HPromTot: 100, HPromMuj: 50 }
      ]);
      jest.spyOn(service as any, 'getFisicoMujeres').mockResolvedValue([
        { Total: 10, Total_Mujeres: 5 }
      ]);

      const result = await service.getPromedioMensual('25', '8-2020');

      expect(result).toEqual({
        promedio: [{ HPromFisic: 90, HPromFMuj: 45, HPromTot: 100, HPromMuj: 50 }],
        total: [{
          totalFisico: 90,
          totalFisicoMuj: 45,
          totalPromedio: 100,
          totalPromedioMujeres: 50
        }],
        clave26: 0
      });
    });

    it('should handle specific UEB case (55)', async () => {
      jest.spyOn(service as any, 'getPromedioByClaveId').mockResolvedValue([{ restar: 0 }]);
      jest.spyOn(service as any, 'getBajaTrab').mockResolvedValue([]);
      jest.spyOn(service as any, 'getPromTrabajadores').mockResolvedValue([
        { HPromFisic: 120, HPromFMuj: 60, HPromTot: 120, HPromMuj: 60 }
      ]);
      jest.spyOn(service as any, 'getFisicoMujeres').mockResolvedValue([
        { Total: 20, Total_Mujeres: 10 }
      ]);

      const result = await service.getPromedioMensual('55', '8-2020');

      expect(result).toEqual({
        promedio: [{ HPromFisic: 100, HPromFMuj: 50, HPromTot: 120, HPromMuj: 60 }],
        total: [{
          totalFisico: 100,
          totalFisicoMuj: 50,
          totalPromedio: 120,
          totalPromedioMujeres: 60
        }],
        clave26: 0
      });
    });
  });

  describe('getPromedioRango', () => {
    it('should fetch promedio rango for UEB 25 with date adjustment', async () => {
      const mockData = [
        { Unidad: 'DIR. GENERAL', HPDTT: 100, HPDTM: 50 }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getPromedioRango('25', '1', '2020-10');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/promTrabajadoresRangoFechas?ueb=25&direccion=276&mes=10&fecha=2020-10'
      );
      expect(result).toEqual({
        promedio: [{ Unidad: 'DIR. GENERAL', HPDTT: 100, HPDTM: 50 }],
        total: [{ Promedio: 100, PromedioMujeres: 50 }],
        fecha: '2020-10',
        ueb: 'Liorad',
        direcc: 'DIR. GENERAL'
      });
    });

    it('should handle API error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getPromedioRango('25', '1', '2020-10'))
        .rejects.toThrow('Failed to fetch promedio rango: API Error');
    });
  });

  describe('getPromedioByClaveId', () => {
    it('should query database for promedio by clave', async () => {
      const mockResult = [{ clave: '26', restar: 1 }];
      mockEntityManager.query.mockResolvedValue(mockResult);

      const result = await (service as any).getPromedioByClaveId('26');

      expect(mockEntityManager.query).toHaveBeenCalledWith(
        `SELECT * FROM promedio WHERE clave = $1`,
        ['26']
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle database error', async () => {
      mockEntityManager.query.mockRejectedValue(new Error('DB Error'));

      await expect((service as any).getPromedioByClaveId('26'))
        .rejects.toThrow('Failed to fetch promedio by clave: DB Error');
    });
  });

  describe('getFuentePrimaria', () => {
    it('should fetch and transform fuente primaria data', async () => {
      const mockData = [
        { nombre: 'LIORAD', codigo: '25' },
        { nombre: 'JULIO TRIGO', codigo: '55' },
        { nombre: 'CITOSTÁTICOS', codigo: '100' },
        { nombre: 'SH+', codigo: '57' },
        { nombre: 'AICA', codigo: '16' }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await (service as any).getFuentePrimaria();

      expect(result).toEqual({
        'LIORAD': { codigo: '25', direccion: '276', diminutivo: 'Liorad' },
        'JULIO TRIGO': { codigo: '55', direccion: '287', diminutivo: 'JT' },
        'CITOSTÁTICOS': { codigo: '100', direccion: '285', diminutivo: 'CITOX' },
        'SH+': { codigo: '57', direccion: '302', diminutivo: 'SH' },
        'AICA': { codigo: '16', direccion: '', diminutivo: 'AICA' }
      });
    });
  });

  describe('restaClave36', () => {
    it('should subtract clave36 values from promedio', () => {
      const promedio = [
        { HPromFisic: 100, HPromFMuj: 50, HPromTot: 100, HPromMuj: 50 }
      ];
      const clave36 = [
        { Total: 10, Total_Mujeres: 5 }
      ];

      const result = (service as any).restaClave36(promedio, clave36);

      expect(result).toEqual([
        { HPromFisic: 90, HPromFMuj: 45, HPromTot: 100, HPromMuj: 50 }
      ]);
    });

    it('should return original promedio if clave36 is empty', () => {
      const promedio = [
        { HPromFisic: 100, HPromFMuj: 50, HPromTot: 100, HPromMuj: 50 }
      ];

      const result = (service as any).restaClave36(promedio, []);

      expect(result).toEqual(promedio);
    });
  });

  describe('addTotalPromedioMensual', () => {
    it('should calculate totals from flat array', () => {
      const promedio = [
        { HPromFisic: 100, HPromFMuj: 50, HPromTot: 100, HPromMuj: 50 },
        { HPromFisic: 50, HPromFMuj: 25, HPromTot: 50, HPromMuj: 25 }
      ];
      const resultado = [];

      (service as any).addTotalPromedioMensual(promedio, 0, resultado, []);

      expect(resultado).toEqual([
        {
          totalFisico: 150,
          totalFisicoMuj: 75,
          totalPromedio: 150,
          totalPromedioMujeres: 75
        }
      ]);
    });

    it('should calculate totals from nested array when inicio is true', () => {
      const promedio = [
        [
          { HPromFisic: 100, HPromFMuj: 50, HPromTot: 100, HPromMuj: 50 },
          { HPromFisic: 50, HPromFMuj: 25, HPromTot: 50, HPromMuj: 25 }
        ]
      ];
      const resultado = [];

      (service as any).addTotalPromedioMensual(promedio, 0, resultado, [], true);

      expect(resultado).toEqual([
        {
          totalFisico: 150,
          totalFisicoMuj: 75,
          totalPromedio: 150,
          totalPromedioMujeres: 75
        }
      ]);
    });
  });

  describe('calcTotalTodasUEB', () => {
    it('should calculate totals across all UEBs', () => {
      const total = [
        { totalFisico: 100, totalFisicoMuj: 50, totalPromedio: 100, totalPromedioMujeres: 50 },
        { totalFisico: 50, totalFisicoMuj: 25, totalPromedio: 50, totalPromedioMujeres: 25 }
      ];

      const result = (service as any).calcTotalTodasUEB(total);

      expect(result).toEqual({
        totalFisico: 150,
        totalFisicoMuj: 75,
        totalPromedio: 150,
        totalPromedioMujeres: 75
      });
    });
  });

  describe('getTotalPromedioDiario', () => {
    it('should calculate daily totals', () => {
      const promedio = [
        { HPDTT: 100, HPDTM: 50 },
        { HPDTT: 50, HPDTM: 25 }
      ];

      const result = (service as any).getTotalPromedioDiario(promedio);

      expect(result).toEqual([
        { Promedio: 150, PromedioMujeres: 75 }
      ]);
    });
  });
});