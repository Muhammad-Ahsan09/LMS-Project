import {clerkClient} from "@clerk/express"
import {v2 as cloudinary} from "cloudinary"
import pool from "../database.js"

export const updateRoleToEducator = async (req, res) => {
    try {
        const userId = req.auth().userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: "Educator"
            }
        })
        
        res.json({success: true, message: "You can publish a new course"})
    } catch (error) {
        res.json({success: false, message: error.message})
        console.log(error.message)
    }
}


export const addCourse = async (req, res) => {
    try {
        const {courseData} = req.body
        const imageFile = req.file

        console.log(imageFile)
        console.log(imageFile.path)

        const educatorId = req.auth().userId

        console.log("Image uploaded to cloudinary")

        const imageUpload = await cloudinary.uploader.upload(imageFile.path)

        

        if(!imageFile) {
            return res.json({success: false, message: "thumbnail not attached"})
        }

        const parsedCourseData = await JSON.parse(courseData)
        parsedCourseData.educatorId = educatorId

        // add course data to course table,
        const courseTableData = await pool.query(`
        INSERT INTO courses("courseTitle", "courseDescription", "courseThumbnail", "coursePrice",
         "isPublished", "discount", "educator")
        VALUES
        ($1, $2, $3, $4, $5, $6, $7) RETURNING id;
        `, [parsedCourseData.courseTitle, parsedCourseData.courseDescription, imageUpload.secure_url,
            parsedCourseData.coursePrice,  true, parsedCourseData.discount, parsedCourseData.educatorId])

        

        console.log("This is id:", courseTableData.rows[0].id)

        // chapter data to chapter table
        parsedCourseData.courseContent.forEach(async (chapter) => {
            const chapterTableData = await pool.query(`
            INSERT INTO chapters("chapterId", "course_id", "chapterOrder", "chapterTitle")
            VALUES($1, $2, $3, $4);
            `, [chapter.chapterId, courseTableData.rows[0].id, chapter.chapterOrder, chapter.chapterTitle])
        })

        

        // lecture data to leture table,
        parsedCourseData.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach(async (lecture) => {
                await pool.query(`
                INSERT INTO lectures("lectureId", "chapter_id", "lectureTitle", "lectureDuration", "lectureUrl",
                "isPreviewFree", "lectureOrder"
                ) 
                VALUES
                ($1, $2, $3, $4, $5, $6, $7);
                `, [lecture.lectureId, chapter.chapterId, lecture.lectureTitle, lecture.lectureDuration, 
                    lecture.lectureUrl, lecture.isPreviewFree, lecture.lectureOrder ])
            })
        })
        // newcourse.courseThumbnail = imageUpload.secure_url
        res.json({success: true, message: "course added"})


    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}


// function to get educator courses, chapters and lectures
const getEducatorCoursesData = async (req, res, educator) => {
    try {
        

        // Getting courses

        const result = await pool.query(`
        SELECT * FROM courses WHERE educator = $1;
        `, [educator])


        const courses = result.rows

        // Getting chapters of the courses
        await Promise.all(
            courses.map( async (course) => {
                const courseChapters = await pool.query(`
                SELECT * FROM chapters WHERE course_id = $1;
                `, [course.id])

                // Getting studente enrolled in a course
                const enrolledStudents = await pool.query(`
                SELECT * FROM is_enrolled_in WHERE course_id = $1;
                `,[course.id])

                course.courseContent = [...courseChapters.rows]
                course.enrolledStudents = enrolledStudents.rows
            })
        )

        
        
        // Getting lectures of the chapters
        await Promise.all(
            courses.map(async (course) => {
                await Promise.all(
                    course.courseContent.map( async (chapter) => {
                        const chapterLectures = await pool.query(`
                        SELECT * FROM lectures WHERE "chapter_id" = $1
                        `, [chapter.chapterId])

                        chapter.chapterContent = chapterLectures.rows
                    })
                )
            })
        )

        return courses;
    } catch (error) {
        console.log(error.message)
        return res.json({success: false, message: error.message})
    }
}

// Get Educator Courses

export const getEducatorCourses = async (req, res) => {
    try {
        const educator = req.auth().userId
       
        const courses = await getEducatorCoursesData(req, res, educator)

        res.json({success: true, courses})


    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}


export const educatorDashboardData = async (req, res) => {
    try {
        const educator = req.auth().userId

        const courses = await getEducatorCoursesData(req, res, educator)

        const totalCourses = courses.length

        const courseIds = courses.map((course) => course.id)

        let result = await pool.query(`
        SELECT * FROM purchases WHERE "courseId" = ANY ($1)
        `, [courseIds])

        const student_ids = result.rows.map((student) => student.userId)

        const purchases = result.rows

        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)

        const enrolledStudentsData = []

        for(const course of courses) {
            result = await pool.query(
                `SELECT "name", imageurl FROM users WHERE id = ANY ($1);`,
                [student_ids])
            
            const students = result.rows
            
            students.forEach((student) => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                })
            })
        }

        res.json({success: true, dashboardData: {
            totalEarnings, enrolledStudentsData, totalCourses
        }})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}

// Get enrolled students data with purchase data

export const getEnrolledStudentsData = async (req, res) => {
    try {
        const educator = req.auth().userId
        const courses = await getEducatorCoursesData(req, res, educator)
        console.log(courses)
        const courseIds = courses.map(course => course.id)

        const result = await pool.query(`
        SELECT * FROM purchases 
        JOIN users ON purchases."userId" = users.id 
        JOIN courses ON purchases."courseId" = courses.id
        WHERE "courseId" = ANY($1) AND status = $2;
        `, [courseIds, "completed"])

        const purchases = result.rows
        console.log("purchases: ", purchases)

        const enrolledStudents = purchases.map((purchase) => ({
            student: {
                id: purchase.userId,
                imageUrl: purchase.imageurl,
                name: purchase.name
            },
            courseTitle: purchase.courseTitle,
            purchaseDate: purchase.createdAt

        }))

        res.json({success: true, enrolledStudents})
    } catch (error) {
        console.log(error)
        res.json({success: false, message:error.message})
    }
}