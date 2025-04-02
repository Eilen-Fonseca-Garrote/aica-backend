
export interface Interrupto {
    EstNV1: string;
    Total_Trabajadores: number;
    Femenino: number;
    Masculino: number;
  }
  
 export interface TotalResult {
    Total: number;
    F: number;
    M: number;
  }
  
  export interface InterruptosEntry {
    Direccion: string;
    covid: number;
    reubicados: number;
    produccion25: number;
    produccion48: number;
  }
  
  export interface TotalInterruptosUEB {
    Covid: TotalResult;
    Reubic: TotalResult;
    Prod25: TotalResult;
    Prod48: TotalResult;
  }