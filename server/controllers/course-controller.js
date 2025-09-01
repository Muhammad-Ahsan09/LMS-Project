import Stripe from "stripe";
import pool from "../database.js";
import dotenv from "dotenv"

dotenv.config()

// Get All courses
export const getAllCourses = async (req, res) => {
    try {
        const result = await pool.query(`
        SELECT courses.id, "courseTitle", "courseDescription", "courseThumbnail",
        "isPublished", "discount", "educator" as educatorId, name, email, imageurl
        FROM courses 
        JOIN users ON courses.educator = users.id
        WHERE "isPublished" = $1;`, [true])

        const courses = result.rows
        console.log(courses)

        courses.forEach((course) => {
            
            course.educator = {
                id : course.educatorid,
                name : course.name,
                email : course.email,
                imageUrl : course.imageurl,
            }
            
            
        })

        

        res.json({succes: true, courses})

    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}

// Get course by id

export const getCourseId = async (req, res) => {
    try {
        const id = Number(req.params.id)
        
        // Getting courses

        const result = await pool.query(`
        SELECT courses.id, "courseTitle", "courseDescription", "courseThumbnail",
        "isPublished", "discount", "educator" as educatorId, name, email, imageurl
        FROM courses 
        JOIN users ON courses.educator = users.id
        WHERE courses.id = $1;
        `, [id])


        const courses = result.rows

        courses.forEach((course) => {
            
            course.educator = {
                id : course.educatorid,
                name : course.name,
                email : course.email,
                imageUrl : course.imageurl,
            }
        })

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

        // Get the only course in the array which is at the index 0
        const courseData = courses[0]

        // Remove lecture url if isPreview is false

        courseData.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach((lecture) => {
                if(!lecture.isPreviewFree) {
                    lecture.lectureUrl = ""
                }
            })
        })

        res.json({succes: true, courseData})

    } catch (error) {
        console.log(error)
        res.json({succes: false, message:error.message})
    }
}


