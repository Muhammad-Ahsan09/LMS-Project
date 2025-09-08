import express from "express"
import cors from "cors"
import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js"
import educatorRouter from "./routes/educator-routes.js"
import { clerkMiddleware } from "@clerk/express"
import connectCloudinary from "./configs/cloudinary.js"
import courseRouter from "./routes/course-routes.js"
import userRouter from "./routes/user-routes.js"


// Initialize Express

const app = express()

// Connect cloudinary
await connectCloudinary()

// Middlewares
app.use(cors())
app.options("*", cors())
app.use(clerkMiddleware())

// Routes
app.get("/", (req, res) => { try { res.send("API Working") } catch (error) { }})
app.post("/clerk", express.json(), clerkWebhooks)
app.use("/api/educator", express.json(), educatorRouter)
app.use("/api/course", express.json(),courseRouter)
app.use("/api/user", express.json(), userRouter)
app.post("/stripe", express.raw({type: "application/json"}), stripeWebhooks)



const PORT = process.env.PORT || 8000

app.listen(PORT, async () => {
    
    console.log(`Server started on port ${PORT}`)
})
