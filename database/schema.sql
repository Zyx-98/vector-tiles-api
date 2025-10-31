-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create roads table
CREATE TABLE IF NOT EXISTS roads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    road_type VARCHAR(50),
    geom GEOMETRY(LineString, 4326),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for better performance
CREATE INDEX IF NOT EXISTS roads_geom_idx ON roads USING GIST (geom);

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
    source_srid INTEGER;
BEGIN
    tile_envelope := ST_TileEnvelope(z, x, y);

    source_srid := Find_SRID('public', 'roads', 'geom');

    IF source_srid = 3857 THEN
        SELECT INTO result ST_AsMVT(q, 'roads', 4096, 'geom')
        FROM (
            SELECT
                id,
                name,
                road_type,
                ST_AsMVTGeom(
                    geom,
                    tile_envelope,
                    4096,
                    256,
                    true
                ) AS geom
            FROM roads
            WHERE geom && tile_envelope
              AND ST_Intersects(geom, tile_envelope)
        ) AS q
        WHERE q.geom IS NOT NULL;
    ELSE
        SELECT INTO result ST_AsMVT(q, 'roads', 4096, 'geom')
        FROM (
            SELECT
                id,
                name,
                road_type,
                ST_AsMVTGeom(
                    ST_Transform(geom, 3857),
                    tile_envelope,
                    4096,
                    256,
                    true
                ) AS geom
            FROM roads
            WHERE ST_Transform(geom, 3857) && tile_envelope
              AND ST_Intersects(ST_Transform(geom, 3857), tile_envelope)
        ) AS q
        WHERE q.geom IS NOT NULL;
    END IF;

    IF result IS NULL THEN
        result := E'\\x';
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;
