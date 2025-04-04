import { Test, TestingModule } from '@nestjs/testing';
import { BuscarTrabajadorService } from './buscarTrabajador.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InternalServerErrorException } from '@nestjs/common';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BuscarTrabajadorService', () => {
  let service: BuscarTrabajadorService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuscarTrabajadorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://mock-api-url'),
          },
        },
      ],
    }).compile();

    service = module.get<BuscarTrabajadorService>(BuscarTrabajadorService);
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getBaseUri', () => {
    it('should set baseUri from config service', () => {
      expect(service['baseUri']).toBe('http://mock-api-url');
      expect(configService.get).toHaveBeenCalledWith('SIGERH_BASE_PATH');
    });
  });

  describe('getCondecoracionesMisiones', () => {
    it('should fetch and filter condecoraciones', async () => {
      const mockData = [
        { CODIGOCOND: '1', Nombre: 'Condec1' },
        { CODIGOCOND: '1', Nombre: 'Condec1-duplicate' },
        { CODIGOCOND: '2', Nombre: 'Condec2' }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getCondecoracionesMisiones('123', '25', 'C');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/condecMisionesTrabajadorCI?ci=123&ueb=25'
      );
      expect(result).toEqual([
        { CODIGOCOND: '1', Nombre: 'Condec1' },
        { CODIGOCOND: '2', Nombre: 'Condec2' }
      ]);
    });

    it('should fetch and filter misiones', async () => {
      const mockData = [
        { CODIGOMIS: '1', Nombre: 'Mision1' },
        { CODIGOMIS: '1', Nombre: 'Mision1-duplicate' },
        { CODIGOMIS: '2', Nombre: 'Mision2' }
      ];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getCondecoracionesMisiones('123', '25', 'M');

      expect(result).toEqual([
        { CODIGOMIS: '1', Nombre: 'Mision1' },
        { CODIGOMIS: '2', Nombre: 'Mision2' }
      ]);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getCondecoracionesMisiones('123', '25', 'C'))
        .rejects.toThrow('API Error');
    });
  });

  describe('filterCondecoraciones', () => {
    it('should filter duplicate condecoraciones', () => {
      const input = [
        { CODIGOCOND: '1', Nombre: 'Condec1' },
        { CODIGOCOND: '1', Nombre: 'Condec1-duplicate' },
        { CODIGOCOND: '2', Nombre: 'Condec2' }
      ];

      const result = service['filterCondecoraciones'](input, 'C');

      expect(result).toEqual([
        { CODIGOCOND: '1', Nombre: 'Condec1' },
        { CODIGOCOND: '2', Nombre: 'Condec2' }
      ]);
    });

    it('should filter duplicate misiones', () => {
      const input = [
        { CODIGOMIS: '1', Nombre: 'Mision1' },
        { CODIGOMIS: '1', Nombre: 'Mision1-duplicate' },
        { CODIGOMIS: '2', Nombre: 'Mision2' }
      ];

      const result = service['filterCondecoraciones'](input, 'M');

      expect(result).toEqual([
        { CODIGOMIS: '1', Nombre: 'Mision1' },
        { CODIGOMIS: '2', Nombre: 'Mision2' }
      ]);
    });

    it('should return empty array for empty input', () => {
      const result = service['filterCondecoraciones']([], 'C');
      expect(result).toEqual([]);
    });
  });

  describe('getEstudiosTrabajador', () => {
    it('should fetch estudios data', async () => {
      const mockData = [{ estudio: 'Licenciatura' }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getEstudiosTrabajador('123', '25');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/estudiosTrabajadorCI?ci=123&ueb=25'
      );
      expect(result).toEqual(mockData);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getEstudiosTrabajador('123', '25'))
        .rejects.toThrow('Error obteniendo datos: API Error');
    });
  });

  describe('getFamiliaresTrabajador', () => {
    it('should fetch familiares data', async () => {
      const mockData = [{ familiar: 'Esposa' }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getFamiliaresTrabajador('123', '25');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/informacionFamiliarCI?ci=123&ueb=25'
      );
      expect(result).toEqual(mockData);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getFamiliaresTrabajador('123', '25'))
        .rejects.toThrow('Error obteniendo datos: API Error');
    });
  });

  describe('getLaboralTrabajador', () => {
    it('should fetch laboral data', async () => {
      const mockData = [{ puesto: 'Developer' }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getLaboralTrabajador('123', '25');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/laboralTrabajadorCI?ci=123&ueb=25'
      );
      expect(result).toEqual(mockData);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getLaboralTrabajador('123', '25'))
        .rejects.toThrow('Error obteniendo datos: API Error');
    });
  });

  describe('getPersonalesTrabajador', () => {
    it('should fetch personal data when no data provided', async () => {
      const mockData = { nombre: 'John Doe' };
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getPersonalesTrabajador('123', '25');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/trabajadorCI?ci=123&ueb=25'
      );
      expect(result).toEqual(mockData);
    });

    it('should return provided personal data without API call', async () => {
      const existingData = { nombre: 'Existing Data' };

      const result = await service.getPersonalesTrabajador('123', '25', existingData);

      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(result).toEqual(existingData);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getPersonalesTrabajador('123', '25'))
        .rejects.toThrow('Error obteniendo datos: API Error');
    });
  });

  describe('getTrabajadorNombreCompleto', () => {
    it('should fetch trabajador by name', async () => {
      const mockData = [{ ci: '123', nombre: 'John Doe' }];
      mockedAxios.get.mockResolvedValue({ data: mockData });

      const result = await service.getTrabajadorNombreCompleto('John Doe', '25');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'http://mock-api-url/recursosHumanos/trabajadorNombreCompleto?nomApell=John Doe&ueb=25'
      );
      expect(result).toEqual(mockData);
    });

    it('should handle API errors', async () => {
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      await expect(service.getTrabajadorNombreCompleto('John Doe', '25'))
        .rejects.toThrow('Failed to fetch trabajador data: API Error');
    });
  });
});