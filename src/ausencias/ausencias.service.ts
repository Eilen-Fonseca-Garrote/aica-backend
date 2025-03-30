import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { FiltersDto } from './dto/filters.dto';
import axios from 'axios';

@Injectable()
export class AusenciasService {
  private readonly logger = new Logger(AusenciasService.name);


  // Listar trabajadores por clave de ausentismo
  public async listAusentismoClaves(ueb: string, fecha: string) {
    if (!ueb || !fecha) {
      throw new InternalServerErrorException('Los parámetros UEB y fecha son obligatorios.');
    }

    const fechaRegex = /^\d{4}-\d{2}$/; // Formato YYYY-MM
    if (!fechaRegex.test(fecha)) {
      throw new InternalServerErrorException('El formato de la fecha debe ser YYYY-MM.');
    }

    try {
      this.logger.log(`Solicitando claves de ausentismo para UEB: ${ueb}, Fecha: ${fecha}`);
      const client = axios.create({ baseURL: 'http://example.com/api' });

      const trabajadores = await client.get(
        `/recursosHumanos/ausentismoClaves?ueb=${ueb}&fecha=${fecha}`,
      );

      if (!trabajadores.data || !Array.isArray(trabajadores.data)) {
        throw new InternalServerErrorException('La respuesta del servicio no es válida.');
      }

      this.logger.log(`Respuesta obtenida: ${JSON.stringify(trabajadores.data)}`);
      return trabajadores.data;
    } catch (error) {
      this.logger.error(`Error al obtener claves de ausentismo: ${error.message}`);

      if (error.response) {
        throw new InternalServerErrorException(
          `Error del servicio externo: ${error.response.status} - ${error.response.data}`,
        );
      } else if (error.request) {
        throw new InternalServerErrorException('No se pudo conectar al servicio externo.');
      } else {
        throw new InternalServerErrorException('Error inesperado: ' + error.message);
      }
    }
  }

  // Listar trabajadores interruptos dados fecha y ueb
  public async listTrabajadoresInterruptos(ueb: string, fecha: string) {
    if (!ueb || !fecha) {
      throw new InternalServerErrorException('Los parámetros UEB y fecha son obligatorios.');
    }

    const fechaRegex = /^\d{4}-\d{2}$/; // Formato YYYY-MM
    if (!fechaRegex.test(fecha)) {
      throw new InternalServerErrorException('El formato de la fecha debe ser YYYY-MM.');
    }

    try {
      this.logger.log(`Solicitando trabajadores interruptos para UEB: ${ueb}, Fecha: ${fecha}`);
      const client = axios.create({ baseURL: 'http://example.com/api' });

      const trabajadores = await client.get(
        `/recursosHumanos/trabajadoresInterruptos?ueb=${ueb}&fecha=${fecha}`,
      );

      if (!trabajadores.data || !Array.isArray(trabajadores.data)) {
        throw new InternalServerErrorException('La respuesta del servicio no es válida.');
      }

      this.logger.log(`Respuesta obtenida: ${JSON.stringify(trabajadores.data)}`);
      return trabajadores.data;
    } catch (error) {
      this.logger.error(`Error al obtener trabajadores interruptos: ${error.message}`);

      if (error.response) {
        throw new InternalServerErrorException(
          `Error del servicio externo: ${error.response.status} - ${error.response.data}`,
        );
      } else if (error.request) {
        throw new InternalServerErrorException('No se pudo conectar al servicio externo.');
      } else {
        throw new InternalServerErrorException('Error inesperado: ' + error.message);
      }
    }
  }


  
  
  
  
  
  
  
  //Filtrar trabajadores por ueb, dirección, área, municipio, reparto, sexo, cantidad de hijos
  //filtrar trabajadores también por grupo sanguíneo, nivel escolar, raza, carrera

  public obtenerFiltros(filters: FiltersDto): Array<[string, string]> {
    const resultado: Array<[string, string]> = [];

    if (filters.direccionFSelect && filters.uebSelect) {
      const direccion = this.getDireccionById(filters.direccionFSelect, filters.uebSelect);
      resultado.push(['Dirección', direccion]);
    }

    if (filters.cargo) {
      resultado.push(['Cargo', filters.cargo.trim()]);
    }

    if (filters.sexoSelect) {
      resultado.push(['Sexo', filters.sexoSelect.trim()]);
    }

    if (filters.edad && filters.edadOperator) {
      resultado.push(['Edad', `${filters.edadOperator}${filters.edad}`]);
    }

    if (filters.carrera) {
      resultado.push(['Carrera', filters.carrera.trim()]);
    }

    if (filters.municipioSelect) {
      resultado.push(['Municipio', filters.municipioSelect.trim()]);
    }

    if (filters.grupoFactor) {
      resultado.push(['Grupo Sanguíneo', filters.grupoFactor.trim()]);
    }

    if (filters.hijos !== undefined) {
      resultado.push(['Cantidad de Hijos', filters.hijos.toString()]);
    }

    if (filters.pcc) {
      resultado.push(['PCC', 'pertenece']);
    }

    if (filters.ujc) {
      resultado.push(['UJC', 'pertenece']);
    }

    if (filters.uebSelect) {
      resultado.push(['UEB', filters.uebSelect.trim()]);
    }

    // Agrega más filtros según sea necesario

    return resultado;
  }

  private getDireccionById(direccionId: string, uebId: string): string {
    // Simula la obtención de la dirección por ID
    return `Dirección Obtenida para ID ${direccionId} y UEB ${uebId}`;
  }
}
  

  