-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create roads table
CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    road_type VARCHAR(50),
    geom GEOMETRY(LineString, 4326),
    geom_3857 GEOMETRY(LineString, 3857),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for better performance
CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST (geom);
CREATE INDEX IF NOT EXISTS roads_geom_3857_idx ON roads USING GIST (geom_3857);

-- Create function to generate vector tiles
CREATE OR REPLACE FUNCTION get_roads_mvt(
    z INTEGER,
    x INTEGER,
    y INTEGER
)
RETURNS BYTEA AS $$
DECLARE
    result BYTEA;
    tile_envelope GEOMETRY;
BEGIN
    tile_envelope := ST_TileEnvelope(z, x, y);

    SELECT INTO result ST_AsMVT(q, 'roads', 4096, 'geom')
    FROM (
        SELECT
            id,
            name,
            road_type,
            ST_AsMVTGeom(
                geom_3857,
                tile_envelope,
                4096,
                256,
                true
            ) AS geom
        FROM roads
        WHERE geom_3857 && tile_envelope
            AND (
                z >= 10 OR
                road_type IN ('highway', 'main_road') OR
                (z >= 8 AND road_type = 'secondary_road')
            )
    ) AS q
    WHERE q.geom IS NOT NULL;

    IF result IS NULL THEN
        result := E'\\x';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;