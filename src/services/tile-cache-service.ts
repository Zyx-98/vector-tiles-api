import { createClient, RedisClientType } from "redis";

export class TileCacheService {
  private _client: RedisClientType;
  private _ttl: number = 86400; // 1 day in seconds

  constructor() {
    this._client = createClient({
      url: process.env.REDIS_URL,
    });

    this._client.on("error", (err) => console.error("Redis Client Error", err));

    this._client.connect().then(() => {
      console.log("Connected to Redis");
    });
  }

  private getTileKey(z: number, x: number, y: number): string {
    return `tile:${z}:${x}:${y}`;
  }

  public async set(
    z: number,
    x: number,
    y: number,
    data: Buffer
  ): Promise<void> {
    const key = this.getTileKey(z, x, y);

    try {
      await this._client.setEx(key, this._ttl, data.toString("base64"));
    } catch (error) {
      console.error("Cache set error:", error);
      throw error;
    }
  }

  public async get(z: number, x: number, y: number): Promise<Buffer | null> {
    const key = this.getTileKey(z, x, y);

    try {
      const data = await this._client.get(key);

      return data ? Buffer.from(data, "base64") : null;
    } catch (error) {
      console.error("Cache get error:", error);
      throw error;
    }
  }

  public async clear(): Promise<void> {
    try {
      const keys = await this._client.keys("tile:*");
      if (keys.length > 0) {
        await this._client.del(keys);
      }
    } catch (error) {
      console.error("Cache clear error:", error);
      throw error;
    }
  }
}
