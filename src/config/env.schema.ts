import * as Joi from 'joi';

export const envSchema = Joi.object({
  APP_PORT: Joi.number().default(4001).required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  SIGERH_BASE_PATH: Joi.string().required(),
  LDAP_LOGIN_SERVICE: Joi.string().required(),
}).unknown();