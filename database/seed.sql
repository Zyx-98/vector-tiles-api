DO $$
DECLARE
    i INTEGER;
    road_count INTEGER := 0;
    batch_size INTEGER := 10000;
    total_roads INTEGER := 1_000_000;
    
    start_lon FLOAT;
    start_lat FLOAT;
    end_lon FLOAT;
    end_lat FLOAT;
    mid_lon FLOAT;
    mid_lat FLOAT;
    
    road_types TEXT[] := ARRAY['highway', 'main_road', 'secondary_road', 'scenic_road', 'local_road', 'residential'];
    road_type TEXT;
    road_name TEXT;
    geom_text TEXT;
    segment_points INTEGER;
    point_idx INTEGER;
    current_lon FLOAT;
    current_lat FLOAT;
    
BEGIN
    RAISE NOTICE 'Starting generation of % roads...', total_roads;
    
    FOR batch IN 0..((total_roads / batch_size) - 1) LOOP
        
        RAISE NOTICE 'Generating batch % of % (roads % to %)', 
            batch + 1, 
            (total_roads / batch_size),
            batch * batch_size,
            (batch + 1) * batch_size;
        
        FOR i IN 1..batch_size LOOP
            start_lon := 100.0 + random() * 12.0;
            start_lat := 6.0 + random() * 19.0;
            
            CASE 
                WHEN random() < 0.05 THEN road_type := 'highway';
                WHEN random() < 0.20 THEN road_type := 'main_road';
                WHEN random() < 0.45 THEN road_type := 'secondary_road';
                WHEN random() < 0.70 THEN road_type := 'local_road';
                ELSE road_type := 'residential';
            END CASE;
            
            CASE road_type
                WHEN 'highway' THEN
                    segment_points := 3 + floor(random() * 5)::INTEGER;
                WHEN 'main_road' THEN
                    segment_points := 2 + floor(random() * 4)::INTEGER;
                WHEN 'secondary_road' THEN
                    segment_points := 2 + floor(random() * 3)::INTEGER;
                ELSE
                    segment_points := 2 + floor(random() * 2)::INTEGER;
            END CASE;
            
            geom_text := 'LINESTRING(';
            current_lon := start_lon;
            current_lat := start_lat;
            
            FOR point_idx IN 0..(segment_points - 1) LOOP
                geom_text := geom_text || current_lon || ' ' || current_lat;
                
                IF point_idx < segment_points - 1 THEN
                    geom_text := geom_text || ', ';
                    
                    CASE road_type
                        WHEN 'highway' THEN
                            current_lon := current_lon + (random() - 0.5) * 0.3;
                            current_lat := current_lat + (random() - 0.5) * 0.3;
                        WHEN 'main_road' THEN
                            current_lon := current_lon + (random() - 0.5) * 0.15;
                            current_lat := current_lat + (random() - 0.5) * 0.15;
                        WHEN 'secondary_road' THEN
                            current_lon := current_lon + (random() - 0.5) * 0.08;
                            current_lat := current_lat + (random() - 0.5) * 0.08;
                        ELSE
                            current_lon := current_lon + (random() - 0.5) * 0.03;
                            current_lat := current_lat + (random() - 0.5) * 0.03;
                    END CASE;
                END IF;
            END LOOP;
            
            geom_text := geom_text || ')';
            
            road_name := road_type || '_' || (batch * batch_size + i);
            
            EXECUTE format('INSERT INTO roads (name, road_type, geom, geom_3857) VALUES (%L, %L, ST_GeomFromText(%L, 4326), ST_GeomFromText(%L, 3857))',
                road_name,
                road_type,
                geom_text,
                geom_text
            );
            
            road_count := road_count + 1;
            
        END LOOP;
        
        -- Commit batch
        COMMIT;
        
    END LOOP;
    
    RAISE NOTICE 'Successfully generated % roads!', road_count;
    
END $$;
