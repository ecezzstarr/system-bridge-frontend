#!/usr/bin/env node

/**
 * Database Migration Script: Neon to Google Cloud SQL
 * 
 * This script exports all data from your Neon database and creates
 * SQL statements to import into Google Cloud SQL.
 * 
 * Usage:
 *   1. Run: node --env-file-if-exists=/vercel/share/.env.project scripts/migrate-to-gcp.js export
 *   2. This creates migration.sql file
 *   3. Import into Cloud SQL: gcloud sql connect [INSTANCE] --user=[USER] < migration.sql
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set. Please ensure environment variables are loaded.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function exportSchema() {
  console.log('Exporting schema from Neon...\n');
  
  // Get all tables
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  
  console.log(`Found ${tables.length} tables: ${tables.map(t => t.table_name).join(', ')}\n`);
  
  let migrationSQL = `-- Migration from Neon to Google Cloud SQL
-- Generated: ${new Date().toISOString()}
-- Tables: ${tables.map(t => t.table_name).join(', ')}

`;

  // Export each table's data
  for (const table of tables) {
    const tableName = table.table_name;
    console.log(`Exporting table: ${tableName}`);
    
    // Get column info
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = ${tableName}
      ORDER BY ordinal_position
    `;
    
    // Get all data from table
    const data = await sql`SELECT * FROM ${sql(tableName)}`;
    
    if (data.length === 0) {
      console.log(`  - No data in ${tableName}`);
      continue;
    }
    
    console.log(`  - Found ${data.length} rows`);
    
    // Generate INSERT statements
    migrationSQL += `\n-- Table: ${tableName} (${data.length} rows)\n`;
    
    const columnNames = Object.keys(data[0]);
    
    for (const row of data) {
      const values = columnNames.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (val instanceof Date) return `'${val.toISOString()}'`;
        if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        return val;
      });
      
      migrationSQL += `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    }
  }
  
  // Write to file
  const fs = require('fs');
  fs.writeFileSync('migration-data.sql', migrationSQL);
  console.log('\n✓ Migration data exported to migration-data.sql');
  
  return tables;
}

async function exportCreateStatements() {
  console.log('\nExporting CREATE TABLE statements...\n');
  
  // Get table definitions
  const result = await sql`
    SELECT 
      'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
      string_agg(
        column_name || ' ' || 
        CASE 
          WHEN data_type = 'uuid' THEN 'UUID'
          WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '255') || ')'
          WHEN data_type = 'text' THEN 'TEXT'
          WHEN data_type = 'integer' THEN 'INTEGER'
          WHEN data_type = 'bigint' THEN 'BIGINT'
          WHEN data_type = 'numeric' THEN 'NUMERIC(' || COALESCE(numeric_precision::text, '10') || ',' || COALESCE(numeric_scale::text, '2') || ')'
          WHEN data_type = 'boolean' THEN 'BOOLEAN'
          WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
          WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
          WHEN data_type = 'jsonb' THEN 'JSONB'
          WHEN data_type = 'json' THEN 'JSON'
          ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
        ORDER BY ordinal_position
      ) || ');' as create_statement,
      table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    GROUP BY table_name
    ORDER BY table_name
  `;
  
  let schemaSQL = `-- Schema for Google Cloud SQL
-- Generated: ${new Date().toISOString()}

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

`;
  
  for (const row of result) {
    schemaSQL += `\n${row.create_statement}\n`;
  }
  
  const fs = require('fs');
  fs.writeFileSync('migration-schema.sql', schemaSQL);
  console.log('✓ Schema exported to migration-schema.sql');
}

async function main() {
  const command = process.argv[2];
  
  if (command === 'export') {
    try {
      await exportCreateStatements();
      await exportSchema();
      
      console.log('\n========================================');
      console.log('MIGRATION INSTRUCTIONS');
      console.log('========================================');
      console.log('1. Create Cloud SQL instance in GCP Console');
      console.log('2. Connect to your Cloud SQL instance:');
      console.log('   gcloud sql connect [INSTANCE_NAME] --user=postgres');
      console.log('3. Create database:');
      console.log('   CREATE DATABASE your_database_name;');
      console.log('4. Connect to the database and run schema:');
      console.log('   \\c your_database_name');
      console.log('   \\i migration-schema.sql');
      console.log('5. Import data:');
      console.log('   \\i migration-data.sql');
      console.log('========================================\n');
    } catch (error) {
      console.error('Export failed:', error);
      process.exit(1);
    }
  } else {
    console.log('Usage: node scripts/migrate-to-gcp.js export');
  }
}

main();
