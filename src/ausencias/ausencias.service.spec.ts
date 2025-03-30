import { Test, TestingModule } from '@nestjs/testing';
import { AusenciasService } from './ausencias.service';

describe('AusenciasService', () => {
  let service: AusenciasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AusenciasService],
    }).compile();

    service = module.get<AusenciasService>(AusenciasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
