# Shareff-Back-End
## Setup
1. Download and install PostgreSQL 9.6 to your local machine, which will be used for your development environment
2. Start PostgreSQL database from your command line, and set up your database
3. Set the environment variables that are required for the project. To do this, open up your bash command line, and run `setx <ENV_VAR> <VALUE>` (e.g. `setx PGUSER "postgres"`). Note, the first 5 are for the PostgreSQL database, and the last one is for generating a JSON Web Token for the authentication
  1. PGUSER - This is the username that you use to log into your PostgreSQL sandbox on your machine. It is probably 'postgres'
  2. PGDATABASE - This is the database that you created in your PostgreSQL sandbox
  3. PGPASSWORD - This is the password that you use to log into your PostgreSQL sandbox on your machine
  4. PGHOST - This is the host for your PostgreSQL sandbox, so you can connect to it from Shareff
  5. PGPORT - This is the port that your PostgreSQL sandbox is running on
  6. JWT_SECRET - This is your JSON Web Token secret, so you can sign JWTs for authentication

## Running the application
1. There are 3 scripts:
  1. `npm start dev` - Sets the `NODE_ENV` environment variable to `development`
  2. `npm start prod` - Sets the `NODE_ENV` environment variable to `production`
  3. `npm start test` - Currently does nothing (TODO)
