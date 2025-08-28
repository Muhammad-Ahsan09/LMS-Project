import { Pool } from "pg";
import dotenv from "dotenv"

dotenv.config()


const pool = new Pool(
    {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_DATABASE,
        ssl: {
            rejectUnauthorized: false,
            
        }

    }
)

pool.on("connect", () => {
    console.log("Database connected")
})

export default pool
 

