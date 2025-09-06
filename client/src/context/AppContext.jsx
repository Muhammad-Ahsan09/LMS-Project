import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import humanizeDuration from "humanize-duration";
import {useAuth, useUser} from "@clerk/clerk-react"
import axios from "axios"
import { toast } from "react-toastify";


export const AppContext = createContext()

export const AppContextProvider = ({children}) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    const currency = import.meta.env.VITE_CURRENCY

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(false)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)

    const {getToken} = useAuth()
    const {user} = useUser() 

    const fetchAllCourses = async () => {
        try {
            const {data} = await axios.get(backendUrl + "/api/course/all");
            
            console.log(data)
            if(data.success) {
                setAllCourses(data.courses)
                console.log("all courses:", allCourses)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const fetchUserData = async () => {
        try {
            if(user.publicMetadata.role === "Educator") {
                setIsEducator(true)
            }
            const token = await getToken()

            const {data} = await axios.get(backendUrl + "/api/user/data", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (data.success) {
                setUserData(data.user)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
            
        }
    }

    // Calculating average rating for course
    const calculateAverageRating = (course) => {
        if(course.courseRatings.length === 0) {
            return 0;
        }

        let totalRating = 0
        course.courseRatings.forEach((rating) => {
            totalRating += rating.rating
        })

        return Math.floor( totalRating / course.courseRatings.length)
    }

    // calculating chapter duration

    const calulateChapterTime = (chapter) => {
        let time = 0
        chapter.chapterContent.forEach((lecture) => {

            time += lecture.lectureDuration
        })

        return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]})
    }

    // calculate course duration
    const caluclateCourseDuration = (course) => {
        let time = 0

        course.courseContent.forEach((chapter) => {
            chapter.chapterContent.forEach((lecture) => {
                time += lecture.lectureDuration
            })
        })
        return humanizeDuration(time * 60 * 1000, {units: ["h", "m"]})
    }

    const calculateNumberOfLectures = (course) => {
        let totalLectures = 0;

        course.courseContent.forEach((chapter) => {
            if( Array.isArray(chapter.chapterContent) ) {
                totalLectures += chapter.chapterContent.length
            }
        })

        return totalLectures
    }

    // Fetch user enrolled courses
    const fetchUserEnrolledCourses = async () => {
        try {
            const token = await getToken()
            const {data} = await axios.get(backendUrl + "/api/user/enrolledCourses", {headers: {
                Authorization: `Bearer ${token}`
            }})

            if(data.success) {
                setEnrolledCourses(data.enrolledCourses.reverse())

            } else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    

    useEffect(() => {
        if(user) {
            fetchUserData()
            fetchUserEnrolledCourses()
        }
    }, [user])




    useEffect(() => {
        fetchAllCourses()
    }, [])


    const value = {
        currency, allCourses, calculateAverageRating, isEducator, setIsEducator,
        calulateChapterTime, caluclateCourseDuration, calculateNumberOfLectures,
        enrolledCourses, fetchUserEnrolledCourses, backendUrl, userData, setUserData, getToken,
        fetchAllCourses

    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}