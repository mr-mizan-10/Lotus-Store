const path = require('path');
const fs = require('fs');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const jsonFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  format.splat(),
  format.json()
);

const logger = createLogger({
  level: 'info',
  format: jsonFormat,
  transports: [
    new transports.Console({ level: 'debug', format: jsonFormat }),
    new DailyRotateFile({
      filename: 'app-%DATE%.log',
      dirname: logDir,
      // rotation will also trigger when file exceeds maxSize
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      // keep rotated files for 14 days
      maxFiles: '14d',
      level: 'info',
      format: jsonFormat,
    }),
    new DailyRotateFile({
      filename: 'error-%DATE%.log',
      dirname: logDir,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
      format: jsonFormat,
    })
  ],
  exitOnError: false,
});

module.exports = logger;
