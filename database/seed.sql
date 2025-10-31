-- Generate 500,000+ random roads in a realistic traffic network pattern
-- Area: Near Vietnam region (expanded boundaries for larger dataset)
-- Longitude: 100°E to 112°E, Latitude: 6°N to 25°N

DO $$
DECLARE
    i INTEGER;
    road_count INTEGER := 0;
    batch_size INTEGER := 10000;
    total_roads INTEGER := 500000;
    
    -- Random parameters
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
    
    -- Loop to generate roads in batches
    FOR batch IN 0..((total_roads / batch_size) - 1) LOOP
        
        RAISE NOTICE 'Generating batch % of % (roads % to %)', 
            batch + 1, 
            (total_roads / batch_size),
            batch * batch_size,
            (batch + 1) * batch_size;
        
        FOR i IN 1..batch_size LOOP
            -- Generate random start point (expanded Vietnam area)
            start_lon := 100.0 + random() * 12.0;  -- 100°E to 112°E
            start_lat := 6.0 + random() * 19.0;    -- 6°N to 25°N
            
            -- Determine road type (weighted distribution)
            CASE 
                WHEN random() < 0.05 THEN road_type := 'highway';
                WHEN random() < 0.20 THEN road_type := 'main_road';
                WHEN random() < 0.45 THEN road_type := 'secondary_road';
                WHEN random() < 0.70 THEN road_type := 'local_road';
                ELSE road_type := 'residential';
            END CASE;
            
            -- Different segment characteristics based on road type
            CASE road_type
                WHEN 'highway' THEN
                    segment_points := 3 + floor(random() * 5)::INTEGER;  -- 3-7 points
                WHEN 'main_road' THEN
                    segment_points := 2 + floor(random() * 4)::INTEGER;  -- 2-5 points
                WHEN 'secondary_road' THEN
                    segment_points := 2 + floor(random() * 3)::INTEGER;  -- 2-4 points
                ELSE
                    segment_points := 2 + floor(random() * 2)::INTEGER;  -- 2-3 points
            END CASE;
            
            -- Build linestring with multiple points
            geom_text := 'LINESTRING(';
            current_lon := start_lon;
            current_lat := start_lat;
            
            FOR point_idx IN 0..(segment_points - 1) LOOP
                -- Add current point
                geom_text := geom_text || current_lon || ' ' || current_lat;
                
                IF point_idx < segment_points - 1 THEN
                    geom_text := geom_text || ', ';
                    
                    -- Calculate next point with some randomness
                    CASE road_type
                        WHEN 'highway' THEN
                            -- Highways tend to go straighter and longer
                            current_lon := current_lon + (random() - 0.5) * 0.3;
                            current_lat := current_lat + (random() - 0.5) * 0.3;
                        WHEN 'main_road' THEN
                            current_lon := current_lon + (random() - 0.5) * 0.15;
                            current_lat := current_lat + (random() - 0.5) * 0.15;
                        WHEN 'secondary_road' THEN
                            current_lon := current_lon + (random() - 0.5) * 0.08;
                            current_lat := current_lat + (random() - 0.5) * 0.08;
                        ELSE
                            -- Local and residential roads are shorter
                            current_lon := current_lon + (random() - 0.5) * 0.03;
                            current_lat := current_lat + (random() - 0.5) * 0.03;
                    END CASE;
                END IF;
            END LOOP;
            
            geom_text := geom_text || ')';
            
            -- Generate road name
            road_name := road_type || '_' || (batch * batch_size + i);
            
            -- Insert the road
            EXECUTE format('INSERT INTO roads (name, road_type, geom) VALUES (%L, %L, ST_GeomFromText(%L, 4326))',
                road_name,
                road_type,
                geom_text
            );
            
            road_count := road_count + 1;
            
        END LOOP;
        
        -- Commit batch
        COMMIT;
        
    END LOOP;
    
    RAISE NOTICE 'Successfully generated % roads!', road_count;
    
END $$;
