import { pool } from "../config/database";

export class VectorTileService {
  async getTile(z: number, x: number, y: number): Promise<Buffer | null> {
    try {
      const maxTile = Math.pow(2, z);

      if (x < 0 || x >= maxTile || y < 0 || y >= maxTile) {
        throw new Error("Invalid tile coordinates ");
      }

      const query = `select get_roads_mvt($1, $2, $3) as mvt`;
      const values = [z, x, y];

      const result = await pool.query(query, values);

      if (!result.rows.length || !result.rows[0].mvt) return null;

      return result.rows[0].mvt;
    } catch (error) {
      console.error("Error fetching vector tile:", error);
      return null;
    }
  }

  async getAllRoadsGeoJSON(): Promise<any> {
    try {
      const query = `
			select jsonb_build_object(
				'type', 'FeatureCollection',
				'features', jsonb_agg(feature)
			) as geojson
			from (
				select jsonb_build_object(
					'type', 'Feature',
					'id', id,
					'geometry', st_asgeojson(geom)::jsonb,
					'properties', jsonb_build_object(
						'name', name,
						'road_type', road_type,
						'created_at', created_at
					)
				) as feature
				from roads
			) features;
		`;

      const result = await pool.query(query);
      return (
        result.rows[0]?.geojson || { type: "FeatureCollection", features: [] }
      );
    } catch (error) {
      console.error("Error fetching all roads GeoJSON:", error);
      throw error;
    }
  }

  async getRoadsByBounds(
    bounds: [number, number, number, number]
  ): Promise<any> {
    try {
      const [minLng, minLat, maxLng, maxLat] = bounds;
      const query = `
		  select jsonb_build_object(
			'type', 'FeatureCollection',
			'features', jsonb_agg(feature)  
		  ) as geojson
		  from (
			select jsonb_build_object(
			  'type', 'Feature',
			  'id', id,
			  'geometry', st_asgeojson(geom)::jsonb,
			  'properties', jsonb_build_object(
				'name', name,
				'road_type', road_type,
				'created_at', created_at
			  )
			) as feature
			from roads
			where geom && st_makeenvelope($1, $2, $3, $4, 4326)
		  ) features;
		`;

      const result = await pool.query(query, [minLng, minLat, maxLng, maxLat]);
      return (
        result.rows[0]?.geojson || { type: "FeatureCollection", features: [] }
      );
    } catch (error) {
      console.error("Error fetching roads by bounds:", error);
      throw error;
    }
  }

  async getStats(): Promise<any> {
    try {
      const query = `
		  select 
           count(*) as total_roads,
           count(distinct road_type) as road_types,
           st_extent(geom) as bounds,
           sum(st_length(geom::geography)) / 1000 as total_length_km
          from roads; 		
		`;

      const result = await pool.query(query);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error fetching roads stats:", error);
      throw error;
    }
  }
}
