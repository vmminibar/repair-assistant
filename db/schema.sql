-- MySQL 8 / MariaDB 10.5+ schema for the MVP.
-- Run once: mysql -u USER -p DB_NAME < db/schema.sql

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  website VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  brand_id INT NOT NULL,
  model_number VARCHAR(120) NOT NULL,
  specs TEXT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_model (category_id, brand_id, model_number),
  KEY idx_model_number (model_number),
  CONSTRAINT fk_models_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_models_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
);

CREATE TABLE IF NOT EXISTS repair_sessions (
  id CHAR(36) PRIMARY KEY,
  category VARCHAR(120) NOT NULL,
  brand VARCHAR(120) NOT NULL,
  model VARCHAR(120) NOT NULL,
  model_status VARCHAR(40) NOT NULL,
  problem TEXT NOT NULL,
  error_code VARCHAR(80) NULL,
  evidence_level VARCHAR(40) NULL,
  request_json MEDIUMTEXT NOT NULL,
  result_json MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed: categories
INSERT IGNORE INTO categories (name, slug) VALUES
 ('Air conditioners and HVAC', 'air-conditioners-hvac'),
 ('Refrigerators and freezers', 'refrigerators-freezers'),
 ('Washing machines and dryers', 'washing-machines-dryers'),
 ('Televisions', 'televisions'),
 ('Computers and laptops', 'computers-laptops'),
 ('Smartphones and tablets', 'smartphones-tablets'),
 ('Water pumps', 'water-pumps'),
 ('Generators', 'generators'),
 ('Electrical appliances', 'electrical-appliances'),
 ('Kitchen equipment', 'kitchen-equipment'),
 ('Motorcycles and scooters', 'motorcycles-scooters'),
 ('Cars and vehicles', 'cars-vehicles'),
 ('Marine engines', 'marine-engines'),
 ('Industrial machinery', 'industrial-machinery'),
 ('Ice-making machines', 'ice-making-machines'),
 ('Cold storage equipment', 'cold-storage-equipment'),
 ('Other products', 'other');

-- Seed: brands (names only; no models are pre-verified)
INSERT IGNORE INTO brands (name) VALUES
 ('Panasonic'), ('Samsung'), ('LG'), ('Daikin'), ('Mitsubishi Electric'), ('Carrier'),
 ('Gree'), ('Midea'), ('Haier'), ('Whirlpool'), ('Bosch'), ('Sony'), ('TCL'),
 ('Hisense'), ('Apple'), ('Dell'), ('HP'), ('Lenovo'), ('Honda'), ('Yamaha'),
 ('Suzuki'), ('Toyota'), ('Kohler'), ('Cummins'), ('Hoshizaki'), ('Scotsman');
