import express from "express"
import cors from "cors"
import { clerkWebhooks } from "./controllers/webhooks.js"
import pool from "./database.js"


// Initialize Express

const app = express()

// Middlewares
app.use(cors())

// Routes
app.get("/", (req, res) => {
    try {
        res.send("API Working")
    } catch (error) {
        
    }
    
})



app.post("/clerk", express.json(), clerkWebhooks)



const PORT = process.env.PORT || 8000

app.listen(PORT, async () => {
    console.log(`Server started on port ${PORT}`)
    await pool.query("INSERT INTO users(name, email, imageUrl) VALUES ('user2', 'user2@email.com','Thisisurl' )")

})
