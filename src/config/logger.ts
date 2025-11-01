import path from "path";
import winston from "winston";

const logDir = "logs";

const loggerFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length) {
      metaStr = "\n" + JSON.stringify(meta, null, 2);
    }

    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: loggerFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      maxFiles: 5,
      maxsize: 5242880, // 5MB
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      maxFiles: 5,
      maxsize: 5242880, // 5MB
    }),
    new winston.transports.File({
      filename: path.join(logDir, "database.log"),
      level: "debug",
      maxFiles: 5,
      maxsize: 5242880, // 5MB
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

export const dbLogger = {
  query: (query: string, params?: any[], duration?: number) => {
    logger.debug("Database Query", {
      type: "query",
      query: query.substring(0, 200),
      params: params?.length ? `${params.length} parameters` : "no parameters",
      duration: duration ? `${duration} ms` : "duration unknown",
    });
  },

  error: (error: Error, context?: any) => {
    logger.error("Database Error", {
      type: "error",
      error: error.message,
      stack: error.stack,
      context,
    });
  },

  connection: (event: string, details?: any) => {
    logger.info("Database Connection Event", {
      type: "connection",
      event,
      details,
    });
  },

  timeout: (query: string, duration: number) => {
    logger.warn("Database Query Timeout", {
      type: "timeout",
      query: query.substring(0, 200),
      duration: `${duration} ms`,
    });
  },

  slowQuery: (query: string, duration: number) => {
    logger.warn("Database Slow Query", {
      type: "slow_query",
      query: query.substring(0, 200),
      duration: `${duration} ms`,
    });
  },
};
