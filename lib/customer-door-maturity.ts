/**
 * Public System Switch and Flame Event must show an already-completed Customer
 * Door even if its owner has not logged in to refresh File Folder progress.
 *
 * This is one bounded, atomic PostgreSQL transition. It does not accelerate
 * the build: only elapsed construction with all original required parts can
 * mature. The public read has no power to issue a new File Folder or a sale.
 */
export async function matureElapsedCustomerDoors(sql: any): Promise<number> {
  const [result] = await sql`
    WITH due AS MATERIALIZED (
      SELECT b.id,b.client_id,b.file_number,b.title,b.blueprint_key
      FROM client_file_folder_builds b
      JOIN client_file_folders f
        ON f.client_id=b.client_id AND f.file_number=b.file_number
      JOIN client_business_stores s
        ON s.client_id=b.client_id AND s.file_number=b.file_number
      WHERE b.system_type='customer_door'
        AND b.status='building'
        AND b.completes_at <= NOW()
        AND f.status='active'
        AND s.enabled=true
        AND (
          SELECT COUNT(DISTINCT p.item_key)::int
          FROM client_file_folder_build_parts p
          WHERE p.build_id=b.id
            AND p.item_key IN (
              'door_foundation_frame','door_identity_facade','door_customer_intake',
              'door_service_interface','door_fulfilment_interface','door_public_commissioning'
            )
        )=6
      ORDER BY b.completes_at ASC
      LIMIT 12
      FOR UPDATE OF b SKIP LOCKED
    ),
    commissioned AS (
      INSERT INTO client_built_systems
        (build_id,client_id,file_number,system_type,title,configuration)
      SELECT
        b.id,b.client_id,b.file_number,'customer_door',b.title,
        jsonb_build_object(
          'blueprintKey',b.blueprint_key,'ownership','client',
          'hostedBy','WEAVE','publicBoundary','customer_door',
          'district','main_file_folder',
          'appliedParts',COALESCE((
            SELECT jsonb_agg(jsonb_build_object('item_key',p.item_key,'quantity',p.quantity))
            FROM client_file_folder_build_parts p WHERE p.build_id=b.id
          ),'[]'::jsonb)
        )
      FROM due b
      ON CONFLICT (build_id) DO NOTHING
      RETURNING build_id
    ),
    complete AS (
      UPDATE client_file_folder_builds b
      SET status='complete',completed_at=COALESCE(b.completed_at,NOW()),updated_at=NOW()
      WHERE b.id IN (SELECT id FROM due)
        AND (
          b.id IN (SELECT build_id FROM commissioned)
          OR EXISTS (
            SELECT 1 FROM client_built_systems s
            WHERE s.build_id=b.id AND s.system_type='customer_door' AND s.status='active'
          )
        )
      RETURNING b.client_id,b.file_number
    ),
    opened AS (
      UPDATE client_business_stores s
      SET
        formation_status=CASE
          WHEN s.first_offer_published_at IS NOT NULL THEN 'selling'
          ELSE 'ready_for_offer'
        END,
        public_opened_at=COALESCE(s.public_opened_at,NOW()),
        updated_at=NOW()
      WHERE EXISTS (
        SELECT 1 FROM complete c
        WHERE c.client_id=s.client_id AND c.file_number=s.file_number
      )
      RETURNING s.id
    )
    SELECT COUNT(*)::int AS matured FROM opened
  `
  return Number(result?.matured || 0)
}
