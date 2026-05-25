import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ListarTrabajadoresFiltersDto } from './dto/listar-trabajadores-filters.dto';

type WorkerRecord = Record<string, unknown>;

interface OptionItem {
  value: string;
  label: string;
}

interface FilterSummaryItem {
  label: string;
  value: string;
}

interface PrimaryQuery {
  key: string;
  endpoint: string;
}

interface NormalizedFilters extends ListarTrabajadoresFiltersDto {
  direccionFSelect: string;
  edadOperator: '<' | '>' | '=';
  fechaGradOperator: '<' | '>';
  fechaAltaOperator: '<' | '>';
}

@Injectable()
export class ListarTrabajadoresService {
  private readonly logger = new Logger(ListarTrabajadoresService.name);

  constructor(private readonly configService: ConfigService) {}

  async getFilterOptions(ueb: string) {
    try {
      const [direcciones, municipios, nivelEscolar, cargos, categorias] =
        await Promise.all([
          this.fetchFromSigerh(`/recursosHumanos/direccionesUEB?ueb=${this.encode(ueb)}`),
          this.fetchFromSigerh(`/recursosHumanos/municipio?ueb=${this.encode(ueb)}`),
          this.fetchFromSigerh(`/recursosHumanos/nivelEscolar?ueb=${this.encode(ueb)}`),
          this.fetchFromSigerh(`/recursosHumanos/cargosUEB?ueb=${this.encode(ueb)}`),
          this.fetchFromSigerh(`/recursosHumanos/categoriaTecn?ueb=${this.encode(ueb)}`),
        ]);

      return {
        direcciones: this.normalizeDirecciones(direcciones),
        municipios: this.normalizeSimpleOptions(municipios, 'MunDesc'),
        nivelEscolar: this.normalizeSimpleOptions(nivelEscolar, 'NivEscDesc'),
        cargos: this.normalizeSimpleOptions(cargos, 'Cargo'),
        categoriasCientificas: this.normalizeSimpleOptions(categorias, 'Categoria'),
      };
    } catch (error) {
      this.logger.error('Error al cargar opciones de filtros', error);
      throw new InternalServerErrorException(
        'No se pudieron cargar las opciones de filtros.',
      );
    }
  }

  async getAreasByDireccion(ueb: string, direccionId: string) {
    if (!this.hasText(direccionId) || direccionId === '0') {
      return [];
    }

    try {
      const direcciones = await this.fetchFromSigerh(
        `/recursosHumanos/direccionesUEB?ueb=${this.encode(ueb)}`,
      );
      const targetId = direccionId.split(',')[0].trim();

      if (!Array.isArray(direcciones)) {
        return [];
      }

      const foundDireccion = direcciones.find((direccion) => {
        const firstArea = this.getAreasFromDireccion(direccion)[0];
        return this.readField(firstArea, 'EstNV1') === targetId;
      });

      if (!foundDireccion) {
        return [];
      }

      const options = this.getAreasFromDireccion(foundDireccion)
        .map((area) => this.readField(area, 'Area'))
        .filter((value) => this.hasText(value))
        .map((value) => ({ value, label: value }));

      return this.uniqueOptions(options);
    } catch (error) {
      this.logger.error('Error al cargar areas por direccion', error);
      throw new InternalServerErrorException(
        'No se pudieron cargar las areas para la direccion seleccionada.',
      );
    }
  }

  async getSubcategorias(ueb: string, categoria: string) {
    try {
      const subcategorias = await this.fetchFromSigerh(
        `/recursosHumanos/subCategoriaTecn?ueb=${this.encode(ueb)}&categ=${this.encode(categoria)}`,
      );

      return this.normalizeSimpleOptions(subcategorias, 'subCateg');
    } catch (error) {
      this.logger.error('Error al cargar subcategorias', error);
      throw new InternalServerErrorException(
        'No se pudieron cargar las subcategorias cientificas.',
      );
    }
  }

  async filtrarTrabajadores(filtersDto: ListarTrabajadoresFiltersDto) {
    const filters = this.normalizeFilters(filtersDto);
    const primaryQuery = this.resolvePrimaryQuery(filters);

    try {
      const rawWorkers = await this.fetchWorkers(primaryQuery.endpoint);
      const direccionNombre = await this.resolveDireccionNombre(
        filters.uebSelect,
        filters.direccionFSelect,
      );
      const filteredWorkers = this.applyAllFilters(
        rawWorkers,
        filters,
        direccionNombre,
      );

      return {
        trabajadores: filteredWorkers,
        total: filteredWorkers.length,
        ubicDefinido: this.hasText(filters.ubicDef),
        filtrosAplicados: this.buildFilterSummary(filters, direccionNombre),
      };
    } catch (error) {
      this.logger.error(
        `Error filtrando trabajadores con query primaria "${primaryQuery.key}"`,
        error,
      );
      throw new InternalServerErrorException(
        'No se pudieron listar los trabajadores con los filtros indicados.',
      );
    }
  }

  private normalizeFilters(filters: ListarTrabajadoresFiltersDto): NormalizedFilters {
    return {
      ...filters,
      uebSelect: this.clean(filters.uebSelect),
      direccionFSelect: this.clean(filters.direccionFSelect || '0'),
      areaSelect: this.clean(filters.areaSelect),
      municipioSelect: this.clean(filters.municipioSelect),
      reparto: this.clean(filters.reparto),
      sexoSelect: this.clean(filters.sexoSelect),
      grupoFactor: this.clean(filters.grupoFactor),
      nescolar: this.clean(filters.nescolar),
      raza: this.clean(filters.raza),
      carrera: this.clean(filters.carrera),
      camisa: this.clean(filters.camisa),
      pantalon: this.clean(filters.pantalon),
      zapato: this.clean(filters.zapato),
      master: this.clean(filters.master),
      fechagrad: this.clean(filters.fechagrad),
      fechaalta: this.clean(filters.fechaalta),
      cargo: this.clean(filters.cargo),
      ubicDef: this.clean(filters.ubicDef),
      cat_cient: this.clean(filters.cat_cient),
      sub_cat_cient: this.clean(filters.sub_cat_cient),
      edadOperator: filters.edadOperator || '=',
      fechaGradOperator: filters.fechaGradOperator || '>',
      fechaAltaOperator: filters.fechaAltaOperator || '>',
    };
  }

  private resolvePrimaryQuery(filters: NormalizedFilters): PrimaryQuery {
    if (this.hasText(filters.sub_cat_cient)) {
      return {
        key: 'sub_cat_cient',
        endpoint:
          `/recursosHumanos/trabajadorCategoriaTecn?ueb=${this.encode(filters.uebSelect)}` +
          `&categoria=${this.encode(filters.sub_cat_cient as string)}`,
      };
    }

    if (this.isEnabled(filters.licConduc)) {
      return {
        key: 'licConduc',
        endpoint:
          `/recursosHumanos/trabajadorLicConduccion?licencia=1&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.isEnabled(filters.auto)) {
      return {
        key: 'auto',
        endpoint:
          `/recursosHumanos/trabajadorAuto?auto=1&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.isEnabled(filters.imprescindible)) {
      return {
        key: 'imprescindible',
        endpoint:
          `/recursosHumanos/trabajadorImprescindible?imprescindible=1&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (typeof filters.hijos === 'number') {
      return {
        key: 'hijos',
        endpoint:
          `/recursosHumanos/trabajadorCantHijos?cantHijos=${filters.hijos}&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.master)) {
      return {
        key: 'master',
        endpoint:
          `/recursosHumanos/trabajadorMasterDoctor?mastDoc=${this.encode(filters.master as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.cargo)) {
      return {
        key: 'cargo',
        endpoint:
          `/recursosHumanos/trabajadorCargo?cargo=${this.encode(filters.cargo as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.areaSelect)) {
      return {
        key: 'area',
        endpoint:
          `/recursosHumanos/trabajadorArea?nombre=${this.encode(filters.areaSelect as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.isEnabled(filters.pcc)) {
      return {
        key: 'pcc',
        endpoint:
          `/recursosHumanos/trabajadorPCC?pcc=1&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.isEnabled(filters.ujc)) {
      return {
        key: 'ujc',
        endpoint:
          `/recursosHumanos/trabajadorUJC?ujc=1&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.carrera)) {
      return {
        key: 'carrera',
        endpoint:
          `/recursosHumanos/trabajadorCarrera?carrera=${this.encode(filters.carrera as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.camisa)) {
      return {
        key: 'camisa',
        endpoint:
          `/recursosHumanos/trabajadorblusCamisa?blusCamisa=${this.encode(filters.camisa as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.zapato)) {
      return {
        key: 'zapato',
        endpoint:
          `/recursosHumanos/trabajadorZapato?zapato=${this.encode(filters.zapato as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.pantalon)) {
      return {
        key: 'pantalon',
        endpoint:
          `/recursosHumanos/trabajadorPantalon?pantalon=${this.encode(filters.pantalon as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.grupoFactor)) {
      return {
        key: 'grupoFactor',
        endpoint:
          `/recursosHumanos/trabajadorGrpSang?grpSang=${this.encode(filters.grupoFactor as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.reparto)) {
      return {
        key: 'reparto',
        endpoint:
          `/recursosHumanos/trabajadorReparto?reparto=${this.encode(filters.reparto as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.municipioSelect)) {
      return {
        key: 'municipio',
        endpoint:
          `/recursosHumanos/trabajadorMunicipio?municipio=${this.encode(filters.municipioSelect as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.fechagrad)) {
      const endpointBase =
        filters.fechaGradOperator === '<'
          ? '/recursosHumanos/trabajadorFechaMenorGraduacion'
          : '/recursosHumanos/trabajadorFechaMayorGraduacion';
      return {
        key: 'fechagrad',
        endpoint:
          `${endpointBase}?fecha=${this.encode(filters.fechagrad as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.fechaalta)) {
      const endpointBase =
        filters.fechaAltaOperator === '<'
          ? '/recursosHumanos/trabajadorFechaMenorAlta'
          : '/recursosHumanos/trabajadorFechaMayorAlta';
      return {
        key: 'fechaalta',
        endpoint:
          `${endpointBase}?fecha=${this.encode(filters.fechaalta as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (typeof filters.experiencia === 'number') {
      return {
        key: 'experiencia',
        endpoint:
          `/recursosHumanos/trabajadorAnnosExp?annosExp=${filters.experiencia}&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.nescolar)) {
      return {
        key: 'nescolar',
        endpoint:
          `/recursosHumanos/trabajadorNivelEscolar?nivEscolar=${this.encode(filters.nescolar as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (typeof filters.edad === 'number') {
      const endpointBase =
        filters.edadOperator === '='
          ? '/recursosHumanos/trabajadorEdad'
          : filters.edadOperator === '>'
            ? '/recursosHumanos/trabajadorMayorEdad'
            : '/recursosHumanos/trabajadorMenorEdad';
      return {
        key: 'edad',
        endpoint:
          `${endpointBase}?edad=${filters.edad}&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.raza)) {
      return {
        key: 'raza',
        endpoint:
          `/recursosHumanos/trabajadorRaza?raza=${this.encode(filters.raza as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (this.hasText(filters.sexoSelect)) {
      return {
        key: 'sexo',
        endpoint:
          `/recursosHumanos/trabajadorSexo?sexo=${this.encode(filters.sexoSelect as string)}` +
          `&ueb=${this.encode(filters.uebSelect)}`,
      };
    }

    if (filters.direccionFSelect !== '0') {
      return {
        key: 'direccion',
        endpoint: this.allWorkersEndpoint(filters.uebSelect),
      };
    }

    if (this.hasText(filters.ubicDef)) {
      return {
        key: 'ubicDef',
        endpoint:
          `/recursosHumanos/trabajadorUbicDefensa?ueb=${this.encode(filters.uebSelect)}` +
          `&ubicDefensa=${this.encode(filters.ubicDef as string)}`,
      };
    }

    return {
      key: 'all',
      endpoint: this.allWorkersEndpoint(filters.uebSelect),
    };
  }

  private async fetchWorkers(endpoint: string): Promise<WorkerRecord[]> {
    try {
      const data = await this.fetchFromSigerh(endpoint);
      return this.normalizeWorkersResponse(data);
    } catch (error) {
      if (this.isAllWorkersEndpoint(endpoint) && this.isStreamAbortError(error)) {
        this.logger.warn(
          'Fallo en endpoint de listado general por CI wildcard. Aplicando fallback con /trabVillar.',
        );
        const fallbackData = await this.fetchFromSigerh('/trabVillar');
        const fallbackWorkers = this.normalizeWorkersResponse(fallbackData);
        const ueb = this.extractQueryParam(endpoint, 'ueb');
        if (!this.hasText(ueb)) {
          return fallbackWorkers;
        }
        return fallbackWorkers.filter((worker) =>
          this.workerBelongsToUeb(worker, ueb as string),
        );
      }
      throw error;
    }
  }

  private async resolveDireccionNombre(
    ueb: string,
    direccionId: string,
  ): Promise<string> {
    if (!this.hasText(direccionId) || direccionId === '0') {
      return '';
    }

    const direcciones = await this.fetchFromSigerh(
      `/recursosHumanos/direccionesUEB?ueb=${this.encode(ueb)}`,
    );

    if (!Array.isArray(direcciones)) {
      return '';
    }

    const targetId = direccionId.split(',')[0].trim();
    for (const direccion of direcciones) {
      const firstArea = this.getAreasFromDireccion(direccion)[0];
      const areaId = this.readField(firstArea, 'EstNV1');
      if (areaId === targetId) {
        const label =
          this.readField(direccion, 'Unidad') ||
          this.readField(firstArea, 'Unidad');
        return this.clean(label);
      }
    }

    return '';
  }

  private applyAllFilters(
    workers: WorkerRecord[],
    filters: NormalizedFilters,
    direccionNombre: string,
  ): WorkerRecord[] {
    return workers.filter((worker) => {
      if (this.hasText(direccionNombre) && !this.hasText(filters.areaSelect)) {
        const workerDireccion = this.getWorkerValue(worker, ['DIRECCION/UEB']);
        if (!this.equals(workerDireccion, direccionNombre)) {
          return false;
        }
      }

      if (this.hasText(filters.areaSelect)) {
        const workerArea = this.getWorkerValue(worker, ['AREA']);
        if (!this.equals(workerArea, filters.areaSelect as string)) {
          return false;
        }
      }

      if (this.hasText(filters.ubicDef)) {
        const workerUbicDef = this.getWorkerValue(worker, ['UBICACION DEFENSA']);
        if (!this.equals(workerUbicDef, filters.ubicDef as string)) {
          return false;
        }
      }

      if (this.isEnabled(filters.imprescindible)) {
        const workerImprescindible = this.getWorkerValue(worker, [
          'ES IMPRESCINDIBLE',
        ]);
        if (!this.isTruthyWorkerValue(workerImprescindible)) {
          return false;
        }
      }

      if (this.hasText(filters.cargo)) {
        const workerCargo = this.getWorkerValue(worker, ['CARGO']);
        if (!this.equals(workerCargo, filters.cargo as string)) {
          return false;
        }
      }

      if (this.hasText(filters.carrera)) {
        const workerCarrera = this.getWorkerValue(worker, ['GRADUADO DE']);
        if (!this.equals(workerCarrera, filters.carrera as string)) {
          return false;
        }
      }

      if (this.hasText(filters.master)) {
        const workerMaster = this.getWorkerValue(worker, ['MASTER/DOCTOR']);
        if (!this.equals(workerMaster, filters.master as string)) {
          return false;
        }
      }

      if (this.hasText(filters.pantalon)) {
        const workerPantalon = this.getWorkerValue(worker, ['TALLA PANTALON']);
        if (!this.equals(workerPantalon, filters.pantalon as string)) {
          return false;
        }
      }

      if (this.hasText(filters.camisa)) {
        const workerCamisa = this.getWorkerValue(worker, ['TALLA BLUSA/CAMISA']);
        if (!this.equals(workerCamisa, filters.camisa as string)) {
          return false;
        }
      }

      if (this.hasText(filters.zapato)) {
        const workerZapato = this.getWorkerValue(worker, ['TALLA CALZADO']);
        if (!this.equals(workerZapato, filters.zapato as string)) {
          return false;
        }
      }

      if (typeof filters.experiencia === 'number') {
        const workerExperiencia = this.getWorkerValueByContains(worker, [
          'EXPERIENCIA',
        ]);
        if (!this.equals(workerExperiencia, String(filters.experiencia))) {
          return false;
        }
      }

      if (this.hasText(filters.sexoSelect)) {
        const workerSexo = this.getWorkerValue(worker, ['SEXO']);
        if (!this.equals(workerSexo, filters.sexoSelect as string)) {
          return false;
        }
      }

      if (this.hasText(filters.nescolar)) {
        console.log(worker);
        const workerNivelEscolar = this.getWorkerValue(worker, ['NIVEL ESCOLAR']);
        if (!this.equals(workerNivelEscolar, filters.nescolar as string)) {
          return false;
        }
      }

      if (this.hasText(filters.reparto)) {
        const workerReparto = this.getWorkerValue(worker, [
          'REPARTO DIRECCION OFICIAL',
        ]);
        if (!this.equals(workerReparto, filters.reparto as string)) {
          return false;
        }
      }

      if (this.hasText(filters.raza)) {
        const workerRaza = this.getWorkerValue(worker, ['RAZA']);
        if (!this.equals(workerRaza, filters.raza as string)) {
          return false;
        }
      }

      if (this.hasText(filters.municipioSelect)) {
        const workerMunicipio = this.getWorkerValue(worker, ['MUNICIPIO OFICIAL']);
        if (!this.equals(workerMunicipio, filters.municipioSelect as string)) {
          return false;
        }
      }

      if (typeof filters.edad === 'number') {
        const workerEdadRaw = this.getWorkerValue(worker, ['EDAD']);
        if (!this.matchesNumericOperator(workerEdadRaw, filters.edad, filters.edadOperator)) {
          return false;
        }
      }

      if (this.hasText(filters.fechagrad)) {
        const workerFechaGrad = this.getWorkerValue(worker, ['FECHA GRADUADO']);
        if (
          !this.matchesDateOperator(
            workerFechaGrad,
            filters.fechagrad as string,
            filters.fechaGradOperator,
          )
        ) {
          return false;
        }
      }

      if (this.hasText(filters.fechaalta)) {
        const workerFechaAlta = this.getWorkerValue(worker, ['FECHA ALTA EMPRESA']);
        if (
          !this.matchesDateOperator(
            workerFechaAlta,
            filters.fechaalta as string,
            filters.fechaAltaOperator,
          )
        ) {
          return false;
        }
      }

      if (typeof filters.hijos === 'number') {
        const workerHijos = this.getWorkerValue(worker, ['CANT. HIJOS']);
        if (!this.equals(workerHijos, String(filters.hijos))) {
          return false;
        }
      }

      if (this.hasText(filters.grupoFactor)) {
        const workerGrupoFactor = this.getWorkerValue(worker, ['GRUPO SANGUINEO']);
        if (!this.equals(workerGrupoFactor, filters.grupoFactor as string)) {
          return false;
        }
      }

      if (this.isEnabled(filters.pcc)) {
        const workerPcc = this.getWorkerValue(worker, ['PCC']);
        if (!this.isTruthyWorkerValue(workerPcc)) {
          return false;
        }
      }

      if (this.isEnabled(filters.ujc)) {
        const workerUjc = this.getWorkerValue(worker, ['UJC']);
        if (!this.isTruthyWorkerValue(workerUjc)) {
          return false;
        }
      }

      if (this.isEnabled(filters.licConduc)) {
        const workerLicConduc = this.getWorkerValue(worker, ['LIC. CONDUCCION']);
        if (!this.isTruthyWorkerValue(workerLicConduc)) {
          return false;
        }
      }

      if (this.isEnabled(filters.auto)) {
        const workerAuto = this.getWorkerValue(worker, ['TIENE AUTO', 'Aut']);
        if (!this.isTruthyWorkerValue(workerAuto)) {
          return false;
        }
      }

      return true;
    });
  }

  private buildFilterSummary(
    filters: NormalizedFilters,
    direccionNombre: string,
  ): FilterSummaryItem[] {
    const summary: FilterSummaryItem[] = [
      {
        label: 'UEB',
        value: this.uebLabel(filters.uebSelect),
      },
    ];

    if (this.hasText(direccionNombre)) {
      summary.push({ label: 'Direccion', value: direccionNombre });
    }
    if (this.hasText(filters.areaSelect)) {
      summary.push({ label: 'Area', value: filters.areaSelect as string });
    }
    if (this.hasText(filters.ubicDef)) {
      summary.push({
        label: 'Ubicacion en la Defensa',
        value: filters.ubicDef as string,
      });
    }
    if (this.hasText(filters.cargo)) {
      summary.push({ label: 'Cargo', value: filters.cargo as string });
    }
    if (this.hasText(filters.carrera)) {
      summary.push({ label: 'Carrera', value: filters.carrera as string });
    }
    if (this.hasText(filters.master)) {
      summary.push({ label: 'Master/Doctor', value: filters.master as string });
    }
    if (this.hasText(filters.reparto)) {
      summary.push({ label: 'Reparto', value: filters.reparto as string });
    }
    if (this.hasText(filters.zapato)) {
      summary.push({ label: 'Talla Zapato', value: filters.zapato as string });
    }
    if (this.hasText(filters.municipioSelect)) {
      summary.push({
        label: 'Municipio',
        value: filters.municipioSelect as string,
      });
    }
    if (this.hasText(filters.raza)) {
      summary.push({ label: 'Raza', value: filters.raza as string });
    }
    if (typeof filters.edad === 'number') {
      summary.push({
        label: 'Edad',
        value: `${filters.edadOperator}${String(filters.edad)}`,
      });
    }
    if (this.hasText(filters.pantalon)) {
      summary.push({
        label: 'Talla Pantalon',
        value: filters.pantalon as string,
      });
    }
    if (typeof filters.hijos === 'number') {
      summary.push({ label: 'Cantidad de Hijos', value: String(filters.hijos) });
    }
    if (this.hasText(filters.grupoFactor)) {
      summary.push({
        label: 'Grupo Sanguineo',
        value: filters.grupoFactor as string,
      });
    }
    if (typeof filters.experiencia === 'number') {
      summary.push({
        label: 'Anios de Experiencia',
        value: String(filters.experiencia),
      });
    }
    if (this.hasText(filters.sexoSelect)) {
      summary.push({
        label: 'Sexo',
        value: filters.sexoSelect === 'F' ? 'Femenino' : 'Masculino',
      });
    }
    if (this.hasText(filters.camisa)) {
      summary.push({
        label: 'Talla Camisa/Blusa',
        value: filters.camisa as string,
      });
    }
    if (this.hasText(filters.nescolar)) {
      summary.push({
        label: 'Nivel Escolar',
        value: filters.nescolar as string,
      });
    }
    if (this.isEnabled(filters.pcc)) {
      summary.push({ label: 'PCC', value: 'Pertenece' });
    }
    if (this.isEnabled(filters.ujc)) {
      summary.push({ label: 'UJC', value: 'Pertenece' });
    }
    if (this.isEnabled(filters.imprescindible)) {
      summary.push({ label: 'Imprescindible', value: 'Si' });
    }
    if (this.isEnabled(filters.licConduc)) {
      summary.push({ label: 'Licencia de Conduccion', value: 'Tiene' });
    }
    if (this.isEnabled(filters.auto)) {
      summary.push({ label: 'Auto', value: 'Tiene' });
    }
    if (this.hasText(filters.fechagrad)) {
      summary.push({
        label: 'Fecha de Graduacion',
        value: `${filters.fechaGradOperator}${filters.fechagrad as string}`,
      });
    }
    if (this.hasText(filters.fechaalta)) {
      summary.push({
        label: 'Fecha Alta Empresa',
        value: `${filters.fechaAltaOperator}${filters.fechaalta as string}`,
      });
    }
    if (this.hasText(filters.cat_cient)) {
      summary.push({
        label: 'Categoria Cientifica',
        value: filters.cat_cient as string,
      });
    }
    if (this.hasText(filters.sub_cat_cient)) {
      summary.push({
        label: 'Sub Categoria Cientifica',
        value: filters.sub_cat_cient as string,
      });
    }

    return summary;
  }

  private normalizeDirecciones(direcciones: unknown): OptionItem[] {
    if (!Array.isArray(direcciones)) {
      return [];
    }

    const result = direcciones
      .map((direccion) => {
        const firstArea = this.getAreasFromDireccion(direccion)[0];
        const value = this.readField(firstArea, 'EstNV1');
        const label =
          this.readField(direccion, 'Unidad') ||
          this.readField(firstArea, 'Unidad');
        if (!this.hasText(value) || !this.hasText(label)) {
          return null;
        }
        return { value, label };
      })
      .filter((item): item is OptionItem => item !== null);

    return this.uniqueOptions(result);
  }

  private normalizeSimpleOptions(data: unknown, key: string): OptionItem[] {
    if (!Array.isArray(data)) {
      return [];
    }

    const options = data
      .map((item) => this.readField(item, key))
      .filter((value) => this.hasText(value))
      .map((value) => ({ value, label: value }));

    return this.uniqueOptions(options);
  }

  private uniqueOptions(options: OptionItem[]): OptionItem[] {
    const seen = new Set<string>();
    const result: OptionItem[] = [];

    for (const option of options) {
      const key = `${option.value}|${option.label}`.toUpperCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push(option);
      }
    }

    return result;
  }

  private getAreasFromDireccion(direccion: unknown): WorkerRecord[] {
    if (!direccion || typeof direccion !== 'object') {
      return [];
    }
    const areas = (direccion as WorkerRecord).Area;
    return Array.isArray(areas) ? (areas as WorkerRecord[]) : [];
  }

  private getWorkerValue(worker: WorkerRecord, keys: string[]): string {
    for (const key of keys) {
      const value = this.readField(worker, key);
      if (this.hasText(value)) {
        return value;
      }
    }
    return '';
  }

  private getWorkerValueByContains(worker: WorkerRecord, tokens: string[]): string {
    const key = Object.keys(worker).find((candidateKey) =>
      tokens.some((token) =>
        candidateKey.toUpperCase().includes(token.toUpperCase()),
      ),
    );
    if (!key) {
      return '';
    }
    return this.clean(worker[key]);
  }

  private readField(item: unknown, key: string): string {
    if (!item || typeof item !== 'object') {
      return '';
    }

    const asRecord = item as WorkerRecord;
    if (Object.prototype.hasOwnProperty.call(asRecord, key)) {
      return this.clean(asRecord[key]);
    }

    const matchedKey = Object.keys(asRecord).find(
      (existingKey) => existingKey.toUpperCase() === key.toUpperCase(),
    );

    return matchedKey ? this.clean(asRecord[matchedKey]) : '';
  }

  private matchesNumericOperator(
    workerValue: string,
    target: number,
    operator: '<' | '>' | '=',
  ): boolean {
    const workerNumber = Number(workerValue);
    if (Number.isNaN(workerNumber)) {
      return false;
    }

    if (operator === '<') {
      return workerNumber < target;
    }
    if (operator === '>') {
      return workerNumber > target;
    }
    return workerNumber === target;
  }

  private matchesDateOperator(
    workerDateRaw: string,
    targetDateRaw: string,
    operator: '<' | '>',
  ): boolean {
    const workerDate = this.parseDate(workerDateRaw);
    const targetDate = this.parseDate(targetDateRaw);

    if (workerDate === null || targetDate === null) {
      return false;
    }

    return operator === '<' ? workerDate < targetDate : workerDate > targetDate;
  }

  private parseDate(value: string): number | null {
    const raw = this.clean(value);
    if (!raw) {
      return null;
    }

    const nativeDate = Date.parse(raw);
    if (!Number.isNaN(nativeDate)) {
      return nativeDate;
    }

    const ddMmYyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddMmYyyy) {
      const [, day, month, year] = ddMmYyyy;
      const parsed = Date.parse(`${year}-${month}-${day}`);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private isTruthyWorkerValue(value: string): boolean {
    const normalized = this.clean(value).toLowerCase();
    return !['', '0', 'false', 'no', 'null', '-'].includes(normalized);
  }

  private equals(left: string, right: string): boolean {
    return this.normalizeComparable(left) === this.normalizeComparable(right);
  }

  private normalizeComparable(value: string): string {
    return this.clean(value).replace(/\s+/g, ' ').toUpperCase();
  }

  private hasText(value?: string | null): boolean {
    return this.clean(value).length > 0;
  }

  private isEnabled(value?: boolean): boolean {
    return value === true;
  }

  private clean(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  private uebLabel(uebCode: string): string {
    const uebMap: Record<string, string> = {
      '16': 'AICA',
      '25': 'LIORAD',
      '100': 'CITOX',
      '55': 'JULIO TRIGO',
      '57': 'SH+',
    };
    return uebMap[uebCode] || uebCode;
  }

  private allWorkersEndpoint(ueb: string): string {
    return (
      `/recursosHumanos/trabajadorCI?ci=${this.encode('%%')}` +
      `&ueb=${this.encode(ueb)}`
    );
  }

  private isAllWorkersEndpoint(endpoint: string): boolean {
    return endpoint.startsWith('/recursosHumanos/trabajadorCI?ci=');
  }

  private isStreamAbortError(error: unknown): boolean {
    if (!axios.isAxiosError(error)) {
      return false;
    }
    return (
      error.code === 'ERR_BAD_RESPONSE' &&
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('stream has been aborted')
    );
  }

  private extractQueryParam(endpoint: string, key: string): string | null {
    const queryPart = endpoint.split('?')[1] || '';
    const params = new URLSearchParams(queryPart);
    return params.get(key);
  }

  private normalizeWorkersResponse(data: unknown): WorkerRecord[] {
    if (Array.isArray(data)) {
      return data as WorkerRecord[];
    }
    if (
      data &&
      typeof data === 'object' &&
      Array.isArray((data as Record<string, unknown>).Trabajadores)
    ) {
      return (data as { Trabajadores: WorkerRecord[] }).Trabajadores;
    }
    return [];
  }

  private workerBelongsToUeb(worker: WorkerRecord, uebCode: string): boolean {
    const workerUeb = this.getWorkerValue(worker, ['UEB', 'DIRECCION/UEB']);
    if (!this.hasText(workerUeb)) {
      return false;
    }

    const normalizedWorkerUeb = this.normalizeComparable(workerUeb);
    const aliases = this.getUebAliases(uebCode).map((alias) =>
      this.normalizeComparable(alias),
    );

    return aliases.some(
      (alias) =>
        normalizedWorkerUeb === alias || normalizedWorkerUeb.includes(alias),
    );
  }

  private getUebAliases(uebCode: string): string[] {
    const label = this.uebLabel(uebCode);
    if (uebCode === '55') {
      return [uebCode, label, 'JT'];
    }
    return [uebCode, label];
  }

  private encode(value: string): string {
    return encodeURIComponent(this.clean(value));
  }

  private async fetchFromSigerh(path: string): Promise<unknown> {
    const baseUri = this.configService.get<string>('SIGERH_BASE_PATH');
    if (!baseUri) {
      throw new InternalServerErrorException(
        'SIGERH_BASE_PATH no esta configurado.',
      );
    }

    const response = await axios.get(`${baseUri}${path}`);
    return response.data;
  }
}
