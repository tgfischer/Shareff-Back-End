// Note, you must set the environment variables beforehand
// This allows us to separate the sandbox/production
// environments
export const config = {
  user: process.env.PGUSER,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000
};
