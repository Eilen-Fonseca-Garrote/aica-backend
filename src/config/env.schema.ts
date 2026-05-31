import * as Joi from 'joi';

export const envSchema = Joi.object({
  APP_PORT: Joi.number().default(4001).required(),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().required(),
  DB_DATABASE: Joi.string().required(),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  SYNCHRO: Joi.boolean().default(false),
  SIGERH_BASE_PATH: Joi.string().required(),
  LDAP_LOGIN_SERVICE: Joi.string().required(),
  MINIO_URL: Joi.string().default('127.0.0.1').required(),
  MINIO_PORT: Joi.number().default(9000).required(),
  MINIO_ACCESS_KEY: Joi.string().default('minioadmin').required(),
  MINIO_SECRET_KEY: Joi.string().default('minioadmin').required(),
  MINIO_BUCKET: Joi.string().default('personal-resources').required(),
  MINIO_USE_SSL: Joi.boolean().default(false),
}).unknown();