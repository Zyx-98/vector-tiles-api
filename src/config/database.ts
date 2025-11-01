import { Pool, PoolClient, PoolConfig } from "pg";
import dotenv from "dotenv";
import { dbLogger, logger } from "./logger";

dotenv.config();

const connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  failedConnections: 0,
  timeouts: 0,
  queries: {
    total: 0,
    success: 0,
    failed: 0,
    slow: 0,
  },
  averageQueryTime: 0,
  longestQueryTime: 0,
};

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "roads",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  max: 20,
  min: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  statement_timeout: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

export const pool = new Pool(poolConfig);

pool.on("connect", () => {
  connectionStats.totalConnections++;
  connectionStats.activeConnections++;

  dbLogger.connection("connect", {
    total: connectionStats.totalConnections,
    active: connectionStats.activeConnections,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
});

pool.on("acquire", () => {
  dbLogger.connection("acquire", {
    active: connectionStats.activeConnections,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
});

pool.on("remove", (client) => {
  connectionStats.activeConnections--;

  dbLogger.connection("remove", {
    active: connectionStats.activeConnections,
    idle: pool.idleCount,
  });
});

pool.on("error", (err) => {
  connectionStats.failedConnections++;
  dbLogger.error(err, {
    event: "pool_error",
    failedConnections: connectionStats.failedConnections,
  });
});

export const monitoredQuery = async (
  queryText: string,
  params?: any[]
): Promise<any> => {
  const startTime = Date.now();
  let client: PoolClient | null = null;

  try {
    connectionStats.queries.total++;
    client = await pool.connect();

    const result = await client.query(queryText, params);
    const duration = Date.now() - startTime;

    connectionStats.queries.success++;
    connectionStats.averageQueryTime =
      (connectionStats.averageQueryTime *
        (connectionStats.queries.success - 1) +
        duration) /
      connectionStats.queries.success;

    if (duration > connectionStats.longestQueryTime) {
      connectionStats.longestQueryTime = duration;
    }

    if (duration > 1000) {
      connectionStats.queries.slow++;
      dbLogger.slowQuery(queryText, duration);
    } else {
      dbLogger.query(queryText, params, duration);
    }

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    connectionStats.queries.failed++;
    if (
      error.message?.includes("timeout") ||
      error.code === "57014" ||
      error.code === "ETIMEDOUT"
    ) {
      connectionStats.timeouts++;
      dbLogger.timeout(queryText, duration);
    } else {
      dbLogger.error(error, { query: queryText, params, duration });
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
};

export const testConnection = async (): Promise<boolean> => {
  try {
    logger.info("Testing database connection...");
    const result = await monitoredQuery(
      "SELECT NOW() as time, version() as version, current_database() as database, current_user as user"
    );

    logger.info("Database connection successful", {
      time: result.rows[0].time,
      database: result.rows[0].database,
      user: result.rows[0].user,
      version: result.rows[0].version.substring(0, 50),
    });

    return true;
  } catch (error) {
    logger.error("Database connection failed", { error });
    return false;
  }
};
