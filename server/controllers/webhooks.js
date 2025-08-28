import { Webhook } from "svix";
import pool from "../database.js";

// API CONTROLLER FUNCTION TO MANAGE CLERK USER WITH DATABASE

export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK__WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body), {
            "svix-id" : req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const {data, type} = req.body

        switch(type){
            case "user.created": {
                const userData = {
                    id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl
                }

                await pool.query(`INSERT INTO users (email, name, imageurl)
                 VALUES ($1, $2, $3 )`, [userData.email, userData.name, userData.imageUrl])
                
                 res.json({})
                 break
            }

            case "user.updated": {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.imageUrl
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