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
        res.json({success: false, message:error.message})
    }
}


export const userEnrolledCourses = async (req, res) => {
    try {
        const userId = req.auth().userId
        let result = await pool.query(`
        SELECT * FROM is_enrolled_in
        JOIN users ON users.id = is_enrolled_in.user_id
        JOIN courses ON is_enrolled_in.course_id = courses.id
        WHERE user_id = $1
        `, [userId])


        const userData = result.rows

        const course_ids = userData.map((course) => course.course_id)

        result = await pool.query(`SELECT * FROM chapters WHERE course_id =ANY($1);`, [course_ids])
        const chapters = result.rows

        const chapter_ids = chapters.map((chapter) => chapter.chapterId)

        result = await pool.query(`SELECT * FROM lectures WHERE chapter_id = ANY($1);`, [chapter_ids])
        const lectures = result.rows

        result = await pool.query(`SELECT * FROM courses_ratings WHERE course_id = ANY($1)`, [course_ids])
        let ratings = result.rows

        userData.forEach(course => {
            course.courseContent = []
            course.courseRatings = []

            chapters.forEach(chapter => {
                if(chapter.course_id === course.id) {
                    course.courseContent.push(chapter)
                }
            })

            lectures.forEach(lecture => {
                course.courseContent.forEach(chapter => {
                    chapter.chapterContent = []
                    if(lecture.chapter_id === chapter.chapterId) {
                        chapter.chapterContent.push(lecture)
                    }
                })
            })

            ratings.forEach(rating => {
                if(rating.course_id === course.id) {
                    course.courseRatings.push(rating)
                    const index = ratings.indexOf(rating)
                    ratings.splice(index)
                }
            })
        })

        res.json({success: true, enrolledCourses: userData})

    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
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
            return res.json({success: false, error: "Data not found"})
        }

        const purchaseData = {
            courseId: courseData.id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2),
        }



        result = await pool.query(`
        INSERT INTO purchases("courseId", "userId", "amount")
        VALUES ($1, $2, $3) RETURNING *
        `, [courseId, userId, Number(purchaseData.amount)])

        const newPurchase = result.rows[0]
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

        res.json({success: true, session_url:session.url})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}

export const updateUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {courseId, lectureId} = req.body

        // lectureId = lectureId.toString()
        

        let result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $2;`, [userId, courseId])

        // console.log("Lecture Completed:", result)
        const progressData = result.rows[0] 
        if(progressData) {
            console.log("Here in progress data")
            if(progressData.lectureCompleted) {
                
                if(progressData.lectureCompleted.includes(lectureId)) {
                    return res.json({success: true, message: 'Lecture Already Completed'})
                }
                await pool.query(`UPDATE is_enrolled_in SET "lectureCompleted" = ARRAY_APPEND("lectureCompleted", $1)
                WHERE user_id = $2 AND course_id = $3;
                `, [lectureId, userId, courseId])
            }

            else {
                await pool.query(`UPDATE is_enrolled_in SET "lectureCompleted" = ARRAY_APPEND("lectureCompleted", $1)
                WHERE user_id = $2 AND course_id = $3;
                `, [lectureId, userId, courseId])
            }
            
            
           
        }

        res.json({success: true, message: "Progress updated"})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
} 


export const getUserCourseProgress = async (req, res) => {
    try {
        const userId = req.auth().userId
        const {courseId} = req.body
        const result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $2;`,
        [userId, courseId])

        const progress = result.rows[0]

        // console.log(progress)

        res.json({success: true, progress})



    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
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

        let result = await pool.query("SELECT * FROM courses WHERE id = $1", [courseId])
        const course = result.rows[0]

        if(!course) {
            return res.json({success: false, message: "Course not found"})
        }

        result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId])
        const user = result.rows[0]

        result = await pool.query(`SELECT * FROM is_enrolled_in WHERE user_id = $1 AND course_id = $2;`, [userId, courseId])

        if(!user || result.rows.length === 0) {
            res.json({success: false, message: "User is not enrolled in course"})
        }

        result = await pool.query(`SELECT * FROM courses_ratings WHERE course_id = $1 AND user_id = $2;`, [courseId, userId])

        const existingRating = result.rows[0];

        if(existingRating) {
            await pool.query(`UPDATE courses_ratings SET rating = $1 WHERE course_id = $2 AND user_id = $3;`, [rating, courseId, userId])
        } else {
            await pool.query(`INSERT INTO courses_ratings (course_id, user_id, rating) VALUES ($1, $2, $3);`, [courseId, userId, rating])
        }

        return res.json({success: true, message: "rating added"})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}