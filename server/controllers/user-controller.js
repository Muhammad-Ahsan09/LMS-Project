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

export const updateUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {courseId, lectureId} = req.body

        let result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $1;`, [userId, courseId])

        const progressData = result.rows[0]
        if(progressData) {
            if(progressData.lectureCompleted.includes(lectureId)) {
                return res.json({succes: true, message: 'Lecture Already Completed'})
            }

            await pool.query(`UPDATE is_enrolled_in SET "lectureCompleted" = ARRAY_APPEND("lectureCompleted", $1)
            WHERE user_id = $2 AND course_id = $3
            `, [lectureId, userId, courseId])
        }

        res.json({succes: true, message: "Progress updated"})
    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
} 


export const getUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {courseId} = req.body
        const result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $2;`,
        [userId, courseId])

        const progress = result.rows[0]

        res.json({succes: true, progress})



    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}


// Add user rating to course

export const addUserRating = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {courseId, rating} = req.body;

        if(!courseId || !userId || !rating || rating < 1 || rating > 5) {
            return res.json({success: false, message: "invalid details"})
        }

        const result = await pool.query("SELECT * FROM courses WHERE id = $1", [courseId])
        const course = result.rows[0]

        if(!course) {
            return res.json({success: false, message: "Course not found"})
        }

        result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId])
        const user = result.rows[0]

        result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $2;`, [userId, courseId])

        if(!user || result.rows.length === 0) {
            res.json({succes: false, message: "User is not enrolled in course"})
        }

        result = await pool.query(`SELECT * FROM courses_ratings WHERE course_id = $1 AND user_id = $2;`, [courseId, userId])

        const existingRating = result.rows[0];

        if(existingRating) {
            await pool.query(`UPDATE courses_ratings SET rating = $1 WHERE coruse_id = $2 AND user_id = $3;`, [rating, courseId, userId])
        } else {
            await pool.query(`INSERT INTO course_ratings (course_id, user_id, rating) VALUES ($1, $2, $3);`, [courseId, userId, rating])
        }

        return res.json({succes: true, message: "rating added"})
    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}