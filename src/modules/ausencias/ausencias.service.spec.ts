import { Test, TestingModule } from '@nestjs/testing';
import { AusenciasService } from './ausencias.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

jest.mock('axios');

describe('AusenciasService', () => {
  let service: AusenciasService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'SIGERH_BASE_PATH') {
          return 'http://example.com/api'; // Mock del baseUri
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AusenciasService,
        { provide: ConfigService, useValue: mockConfigService }, // Mock de ConfigService
      ],
    }).compile();

    service = module.get<AusenciasService>(AusenciasService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('trabPorClaves', () => {
    it('debería devolver las claves correspondientes a la UEB', async () => {
      const mockResponse = [
        { UEB: 'JT', CLAVES: ['clave1', 'clave2'] },
        { UEB: 'AICA', CLAVES: ['clave3'] },
      ];

      jest.spyOn(service, 'getTrabCountClaves').mockResolvedValue(mockResponse);

      const result = await service.trabPorClaves(['clave1', 'clave2'], '03-2025', '55');
      expect(result).toEqual(['clave1', 'clave2']);
    });

    it('debería devolver un array vacío si no se encuentra la UEB', async () => {
      const mockResponse = [
        { UEB: 'AICA', CLAVES: ['clave3'] },
      ];

      jest.spyOn(service, 'getTrabCountClaves').mockResolvedValue(mockResponse);

      const result = await service.trabPorClaves(['clave1', 'clave2'], '03-2025', '55');
      expect(result).toEqual([]);
    });
  });

  describe('AusenciasService - cantTrabajadoresInterruptos', () => {
    it('debería devolver los datos de trabajadores interruptos', async () => {
      const mockResponse = [
        {
          Unidad: 'Unidad 1',
          Area: [{ EstNV1: '123' }],
        },
        {
          Unidad: 'Unidad 2',
          Area: [{ EstNV1: '456' }],
        },
      ];
      const interruptos = [
        { EstNV1: '123', Total_Trabajadores: 10, Femenino: 5, Masculino: 5 },
        { EstNV1: '456', Total_Trabajadores: 8, Femenino: 4, Masculino: 4 },
      ];
      jest.spyOn(axios, 'get').mockResolvedValue({ data: mockResponse });


      jest.spyOn(service, 'buscarInterrupto').mockImplementation((codigoDir, interruptos) => {
        interruptos = [
          { EstNV1: '123', Total_Trabajadores: 10, Femenino: 5, Masculino: 5 },
          { EstNV1: '456', Total_Trabajadores: 8, Femenino: 4, Masculino: 4 },
        ];
        const interrupto = interruptos.find((int) => int.EstNV1 === codigoDir);
        return interrupto ? interrupto.Total_Trabajadores : 0;
      });

      const result = await service.cantTrabajadoresInterruptos(16, '03-2025');

      expect(result.interruptos).toEqual([
        {
          Direccion: 'Unidad 1',
          covid: 10,
          reubicados: 10,
          produccion25: 10,
          produccion48: 10,
        },
        {
          Direccion: 'Unidad 2',
          covid: 8,
          reubicados: 0,
          produccion25: 0,
          produccion48: 0,
        },
        {
          Direccion: 'Sin Dirección', // Valor predeterminado para Unidad undefined
          covid: 0,
          reubicados: 8,
          produccion25:8,
          produccion48: 8,
        },
      ]);

      expect(result.totales).toEqual({
        Total: 18,
        F: 9,
        M: 9,
      });
    });
  });

  describe('Rendimiento de trabPorClaves', () => {
    it('debería ejecutarse en menos de 100ms', async () => {
      const mockResponse = [
        { UEB: 'JT', CLAVES: ['clave1', 'clave2'] },
      ];

      jest.spyOn(service, 'getTrabCountClaves').mockResolvedValue(mockResponse);

      const start = performance.now();
      await service.trabPorClaves(['clave1', 'clave2'], '03-2025', '55');
      const end = performance.now();

      expect(end - start).toBeLessThan(100);
    });
  });

  describe('Rendimiento de cantTrabajadoresInterruptos', () => {
    it('debería ejecutarse en menos de 200ms', async () => {
      const mockResponse = [
        {
          Unidad: 'Unidad 1',
          Area: [{ EstNV1: '123' }],
        },
        {
          Unidad: 'Unidad 2',
          Area: [{ EstNV1: '456' }],
        },
      ];
      jest.spyOn(axios, 'get').mockResolvedValue({ data: mockResponse });

      jest.spyOn(service, 'buscarInterrupto').mockImplementation((codigoDir, interruptos) => {
        const interrupto = interruptos.find((int) => int.EstNV1 === codigoDir);
        return interrupto ? interrupto.Total_Trabajadores : 0;
      });

      const start = performance.now();
      await service.cantTrabajadoresInterruptos(16, '03-2025');
      const end = performance.now();

      expect(end - start).toBeLessThan(200);
    });
  });
});

// hacer una prueba de caja blanca, escoger un metodo que tenga condicionales 
//para poder hacer el metodo de la caja blanca de condicionales que es el mas sencillo

describe('Prueba de Caja Blanca para trabPorClaves', () => {
  let service: AusenciasService;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://example.com/api'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AusenciasService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AusenciasService>(AusenciasService);
    configService = module.get<ConfigService>(ConfigService);

    // Mock de getUEBByCode
    jest.spyOn(service, 'getUEBByCode').mockImplementation((code) => {
      if (code === '55') return 'Julio Trigo';
      if (code === '100') return 'CITOX';
      return '';
    });

    // Mock de getTrabCountClaves
    jest.spyOn(service, 'getTrabCountClaves').mockImplementation(async (codigos, fecha) => {
      if (codigos.includes('clave1')) {
        return [
          { UEB: 'JT', CLAVES: ['clave1', 'clave2'] },
          { UEB: 'AICA', CLAVES: ['clave3'] },
        ];
      }
      if (codigos.includes('clave3')) {
        return [
          { UEB: 'AICA', CLAVES: ['clave3'] },
        ];
      }
      return [];
    });
  });

  // Caso 1: UEB encontrada (Julio Trigo -> JT)
  it('debería devolver claves cuando la UEB coincide (Julio Trigo)', async () => {
    const result = await service.trabPorClaves(['clave1', 'clave2'], '03-2025', '55');
    expect(result).toEqual(['clave1', 'clave2']);
  });

  // Caso 2: UEB encontrada (otra UEB en mayúsculas)
  it('debería devolver claves cuando la UEB coincide (otra UEB)', async () => {
    const result = await service.trabPorClaves(['clave3'], '03-2025', '66');
    expect(result).toEqual(['clave3']);
  });

  // Caso 3: UEB no encontrada
  it('debería devolver array vacío cuando la UEB no coincide', async () => {
    const result = await service.trabPorClaves(['clave3'], '03-2025', '55');
    expect(result).toEqual([]);
  });

  // Caso 4: Sin datos de clavesCount
  it('debería devolver array vacío cuando no hay datos', async () => {
    const result = await service.trabPorClaves(['clave99'], '03-2025', '55');
    expect(result).toEqual([]);
  });

  // Caso 5: Verificar que el bucle while termina al encontrar la UEB
  it('debería terminar el bucle cuando encuentra la UEB', async () => {
    const spyGetTrabCountClaves = jest.spyOn(service, 'getTrabCountClaves');
    await service.trabPorClaves(['clave1', 'clave2'], '03-2025', '55');
    
    // Verificamos que solo se hizo una iteración (porque encuentra JT primero)
    expect(spyGetTrabCountClaves).toHaveBeenCalledTimes(1);
  });
});