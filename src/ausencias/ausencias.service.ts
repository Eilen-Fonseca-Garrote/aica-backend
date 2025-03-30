import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

}