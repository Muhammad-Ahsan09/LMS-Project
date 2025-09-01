import Stripe from "stripe"
import pool from "../database.js"
import dotenv from "dotenv"

dotenv.config()

export const getUserData = async (req, res) => {
    try {
        const userId = req.auth().userId

        let result = await pool.query(`
        SELECT * FROM users WHERE id = $1;
        `, [userId])        

        const user = result.rows[0]

        result = await pool.query(`
        SELECT * FROM is_enrolled_in
        JOIN courses ON is_enrolled_in.course_id = courses.id
        WHERE user_id = $1
        `, [userId])

        const enrolledCourses = result.rows

        user.enrolledCourses = enrolledCourses

        if(!user) {
            return res.json({success: false,  message: "User not found"})
        }

        res.json({success: true, user})


    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}


export const userEnrolledCourses = async (req, res) => {
    try {
        const userId = req.auth().userId
        const result = await pool.query(`
        SELECT * FROM is_enrolled_in
        JOIN users ON users.id = is_enrolled_in.user_id
        JOIN courses ON is_enrolled_in.course_id = courses.id
        WHERE user_id = $1
        `, [userId])

        console.log(result)

        const userData = result.rows
        console.log(userData)

        res.json({succes: true, enrolledCourses: userData})

    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}


export const purchaseCourse = async (req, res) => {
    try {
        const {courseId} = req.body
        const {origin} = req.headers
        const userId = req.auth().userId
        let result = await pool.query(`
        SELECT * FROM users WHERE id = $1;
        `, [userId])

        const userData = result.rows[0]

        result = await pool.query(`
        SELECT * FROM courses WHERE id = $1
        `, [courseId])

        const courseData = result.rows[0]

        if(!userData || !courseData) {
            return res.json({succes: false, error: "Data not found"})
        }

        const purchaseData = {
            courseId: courseData.id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
        }

        console.log(courseData.coursePrice )

        console.log("amount:", purchaseData.amount)

        result = await pool.query(`
        INSERT INTO purchases("courseId", "userId", "amount")
        VALUES ($1, $2, $3) RETURNING *
        `, [courseId, userId, Number(purchaseData.amount)])

        const newPurchase = result.rows[0]
        console.log(newPurchase)

        // Stripe gateway initialize

        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

        const currency = process.env.CURRENCY.toLowerCase()

        const line_items = [{
            price_data: {
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100,
            },
            quantity:1
        }]

        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items: line_items,
            mode: "payment",
            metadata: {
                purchaseId: newPurchase.id
            }
        })

        res.json({succes: true, session_url:session.url})
    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}
