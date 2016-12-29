# Shareff-Back-End
## Setup
1. Download and install PostgreSQL 9.6 to your local machine, which will be used for your development environment
2. Start PostgreSQL database from your command line, and set up your database. You need to
  1. Make a database
  2. Make a database user
  3. Give the user a password
3. Set the environment variables for your development database, so they match the credentials you input in the previous step. To do this, open up your bash command line, and run `setx <ENV_VAR> <VALUE>` (e.g. `setx PGUSER "postgres"`)
  1. PGUSER
  2. PGDATABASE
  3. PGPASSWORD
  4. PGPORT

## Running the application
1. There are 3 scripts:
  1. `npm start dev` - Sets the `NODE_ENV` environment variable to `development`
  2. `npm start prod` - Sets the `NODE_ENV` environment variable to `production`
  3. `npm start test` - Currently does nothing (TODO)
