import { Router } from "express";
import { VectorTileService } from "../services/vector-tile-service";
import { TileCacheService } from "../services/tile-cache-service";

const router = Router();
const vectorTileService = new VectorTileService(new TileCacheService());

router.get("/tiles/:z/:x/:y.mvt", async (req, res) => {
  try {
    const z = parseInt(req.params.z);
    const x = parseInt(req.params.x);
    const y = parseInt(req.params.y);

    if (isNaN(z) || isNaN(x) || isNaN(y)) {
      return res.status(400).send("Invalid tile coordinates");
    }

    if (z < 0 || z > 22) {
      return res.status(400).send("Zoom level out of bounds");
    }

    const tile = await vectorTileService.getTile(z, x, y);

    if (!tile?.length) {
      return res.status(204).send();
    }

    res.setHeader("Content-Type", "application/x-protobuf");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");

    return res.send(tile);
  } catch (error) {
    console.error("Error fetching tile:", error);
    return res.status(500).send("Internal Server Error");
  }
});

router.get("/roads", async (req, res) => {
  try {
    const geojson = await vectorTileService.getAllRoadsGeoJSON();
    res.json(geojson);
  } catch (error) {
    console.error("Error fetching all roads:", error);
    return res.status(500).send("Internal Server Error");
  }
});

router.get("/roads/bounds", async (req, res) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;

    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({
        error: "Missing required parameters: minLng, minLat, maxLng, maxLat",
      });
    }

    const bounds: [number, number, number, number] = [
      parseFloat(minLng as string),
      parseFloat(minLat as string),
      parseFloat(maxLng as string),
      parseFloat(maxLat as string),
    ];

    if (bounds.some(isNaN)) {
      return res.status(400).json({ error: "Invalid coordinate values" });
    }

    const geojson = await vectorTileService.getRoadsByBounds(bounds);
    res.json(geojson);
  } catch (error) {
    console.error("Error fetching roads by bounds:", error);
    return res.status(500).send("Internal Server Error");
  }
});

router.get("/stats", async (req, res) => {
  try {
    const stats = await vectorTileService.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

export default router;
