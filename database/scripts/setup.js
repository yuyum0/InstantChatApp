const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'instant_chat',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  try {
    console.log('🔧 Setting up InstantChat database...');
    
    // Read schema file
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database schema created successfully!');
    
    // Create some initial data
    await createInitialData();
    
    console.log('✅ Initial data created successfully!');
    console.log('🎉 Database setup completed!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

async function createInitialData() {
  try {
    // Create a test user
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await pool.query(`
      INSERT INTO users (username, email, password_hash, status) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['testuser', 'test@example.com', hashedPassword, 'online']);
    
    // Create another test user
    const hashedPassword2 = await bcrypt.hash('password123', 10);
    await pool.query(`
      INSERT INTO users (username, email, password_hash, status) 
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (username) DO NOTHING
    `, ['testuser2', 'test2@example.com', hashedPassword2, 'online']);
    
    console.log('👥 Test users created');
    
  } catch (error) {
    console.error('Error creating initial data:', error);
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase }; 