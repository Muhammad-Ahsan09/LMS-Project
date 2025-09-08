import { Webhook } from "svix";
import pool from "../database.js";
import Stripe from "stripe";
import dotenv from "dotenv"

dotenv.config()

// API CONTROLLER FUNCTION TO MANAGE CLERK USER WITH DATABASE

export const clerkWebhooks = async (req, res) => {
    try {
        console.log("inside clerk webhook")
        const whook = new Webhook(process.env.CLERK__WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body), {
            "svix-id" : req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        console.log("inside clerk webhook 2")


        const {data, type} = req.body

        console.log("inside clerk webhook 3")


        console.log(data)
        switch(type){

            case "user.created": {
                const userData = {
                    id: data.id,
                    email: data.email_addresses[0]?.email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }

                console.log(userData)
                console.log("inside clerk webhook 4")


                await pool.query(`INSERT INTO users (id, email, name, imageurl)
                 VALUES ($1, $2, $3, $4 )`, [userData.id, userData.email, userData.name, userData.imageUrl])
                console.log("inside clerk webhook 5")
                
                res.json({})
                break
            }

            case "user.updated": {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url
                }

                await pool.query('UPDATE users SET email = $1, name = $1, imageurl = $1 WHERE id = $4;', [data.id])

                res.json({})
                break
            }

            case "user.deleted" : {
                await pool.query(`DELETE FROM users WHERE id = $1;`, [data.id])

                res.json({})
                break
            }

            default: 
                break;
        }
    } catch (error) {
        console.log("error:", error.message)
        res.json({success: false, message: error.message})

    }
}


const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async (req, res) => {
    const sig = req.headers['stripe-signature']
    let event;

    try {

        event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)

        switch(event.type) {
            case "payment_intent.succeeded": {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id

                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                })

                const {purchaseId} = session.data[0].metadata
                let result = await pool.query(`SELECT * FROM purchases WHERE id = $1;`,[purchaseId])

                const purchaseData = result.rows[0]

                console.log("in success block")

                result = await pool.query(`SELECT * FROM users WHERE id = $1`, [purchaseData.userId])
                const userData = result.rows[0]

                result = await pool.query(`SELECT * FROM courses WHERE id = $1`, [purchaseData.courseId])
                const courseData = result.rows[0]

                await pool.query(`INSERT INTO is_enrolled_in (user_id, course_id) VALUES ($1, $2);`, [userData.id, courseData.id])

                await pool.query(`UPDATE purchases SET status = $1 WHERE id = $2;`, ["completed", purchaseId])

                result = await pool.query(`SELECT * FROM purchases WHERE id = $1`, [purchaseId])

                console.log("purchase:", result.rows)
                break
            }

            case "payment_intent.payment_failed": {

                console.log("payment failed")

                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id

                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId
                })

                const {purchaseId} = session.data[0].metadata;
                const purchaseData = await pool.query(`UPDATE purchases SET status = "failed" WHERE id = $1;`, [purchaseId]) 

                break
            }

            default:
                console.log(`Unhandled event type ${event.type}`)
            
        }
        res.json({recieved: true })

    } catch (error) {
        console.log(error.message)
    }

    
}