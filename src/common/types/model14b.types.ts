export interface TrabajadorModelo14B {
  TrbNom?: string;
  TrbAp1?: string;
  TrbAp2?: string;
  TrbSexo?: string;
  TrbCodExp?: string;
  NivEscDesc?: string;
  CarDesc?: string;
  GesCatOcup?: string;
  GesCod?: string;
  total?: string;
  GesSalEsc?: string;
  CLA?: string;
  'Mast/Doct'?: string;
  OtrosPagos?: string;
}

export interface AreaModelo14B {
  Area: string;
  trabs: TrabajadorModelo14B[];
}

export interface DireccionModelo14B {
  Unidad: string;
  Area: AreaModelo14B[];
}

export interface UEBModelo14B {
  ueb: string;
  direcciones: DireccionModelo14B[];
}
