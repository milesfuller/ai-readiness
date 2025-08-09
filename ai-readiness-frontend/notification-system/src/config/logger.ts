import winston from 'winston';
import * as path from 'path';

const {
  LOG_LEVEL = 'info',
  LOG_FILE = 'logs/app.log',
  NODE_ENV = 'development'
} = process.env;

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

const transports: winston.transport[] = [];

// Console transport for development
if (NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: consoleFormat
    })
  );
}

// File transport for all environments
transports.push(
  new winston.transports.File({
    filename: path.join(process.cwd(), LOG_FILE),
    level: LOG_LEVEL,
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

// Error file transport
transports.push(
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs/error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

export const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: logFormat,
  defaultMeta: {
    service: 'notification-system',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs/rejections.log')
    })
  ]
});

// Create logs directory if it doesn't exist
import * as fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export default logger;