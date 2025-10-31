import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import compression from "compression";
import routes from "./routes";
import { testConnection } from "./config/database";

dotenv.config();

const PORT = process.env.PORT || 3000;

const app: Application = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(compression() as any);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "Vector Tile API",
    version: "1.0.0",
    endpoints: {
      tiles: "/api/tiles/{z}/{x}/{y}.mvt",
      roads: "/api/roads",
      roadsByBounds: "/api/roads/bounds?minLon=&minLat=&maxLon=&maxLat=",
      stats: "/api/stats",
      health: "/api/health",
    },
    documentation: {
      mapbox: "https://docs.mapbox.com/vector-tiles/reference/",
      tilejson: {
        tilejson: "2.2.0",
        name: "Roads",
        description: "Road network in Vietnam",
        version: "1.0.0",
        attribution: "Roads API",
        scheme: "xyz",
        tiles: [`http://localhost:${PORT}/api/tiles/{z}/{x}/{y}.mvt`],
        minzoom: 0,
        maxzoom: 14,
        bounds: [102.0, 8.0, 109.5, 23.5],
        center: [106.0, 16.0, 6],
      },
    },
  });
});

app.use("/api", routes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

const startServer = async () => {
  try {
    const connected = await testConnection();
    if (!connected) {
      console.error("Failed to connect to database. Exiting...");
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(
        `Tiles: http://localhost:${PORT}/api/tiles/{z}/{x}/{y}.mvt`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
