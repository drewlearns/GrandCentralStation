#!/bin/bash

# Database connection parameters
DB_NAME="your_database_name"
DB_USER="your_database_user"
DB_PASSWORD="your_database_password"
DB_HOST="localhost"
DB_PORT="5432"  # Default PostgreSQL port

# Function to execute a SQL command
execute_sql() {
  local sql_command="$1"
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -p $DB_PORT -c "$sql_command"
}

# Create the 'users' table
create_users_table() {
  local create_table_sql="
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(50),
      first_name VARCHAR(255),
      last_name VARCHAR(255),
      created_at TIMESTAMP
    );
  "
  echo "Creating 'users' table..."
  execute_sql "$create_table_sql"
}

# Main function to manage table creation
main() {
  create_users_table
  # You can call other functions to create more tables here
  # create_other_table
}

# Run the main function
main
