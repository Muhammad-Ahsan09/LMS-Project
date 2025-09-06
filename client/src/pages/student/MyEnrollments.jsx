import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import {  Link } from 'react-router-dom'
import {Line} from "rc-progress"
import Footer from "../../components/student/Footer"
import axios from 'axios'

const MyEnrollments = () => {

  const {enrolledCourses, fetchUserEnrolledCourses, caluclateCourseDuration, userData,
  backendUrl, getToken, calculateNumberOfLectures} = useContext(AppContext)

  const [progressArray, setProgressArray] = useState([])

  const getCourseProgress = async () => {

    try {
      const token = await getToken()
    const tempProgressArray = await Promise.all(
      enrolledCourses.map(async (course) => {
        const {data} = await axios.post(backendUrl + "/api/user/get-course-progress", {
          courseId: course.id
        }, {headers: {Authorization: `Bearer ${token}`}})

      let totalLectures = calculateNumberOfLectures(course);
      const lectureCompleted = (data.progress && data.progress.lectureCompleted) ? data.progress.lectureCompleted.length : 0;
        
      console.log("Data",data,  "Total:", totalLectures, "Completed:", lectureCompleted)
      return {totalLectures, lectureCompleted}
      })
    )
    setProgressArray(tempProgressArray)
    } catch (error) {
      toast.error(error.message)
    }
    
    
  }

  useEffect(() => {
    if(userData) {
      fetchUserEnrolledCourses()
    }
  }, [userData])

  useEffect(() => {
    if (enrolledCourses.length > 0) {
      getCourseProgress()
    }
  }, [enrolledCourses])

  

  return (
    <>
      <div className='md:px-36 px-8 pt-10'>
        <h1 className='text-2xl font-semibold'>My Enrollements</h1>
        <table className='md:table-auto table-fixed w-full overflow-hidden border mt-10'>
          <thead>
            <tr>
              <th className='px-4 py-3 font-semibold truncate'>Course</th>
              <th className='px-4 py-3 font-semibold truncate'>Duration</th>
              <th className='px-4 py-3 font-semibold truncate'>Completed</th>
              <th className='px-4 py-3 font-semibold truncate'>Status</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            {
              enrolledCourses.map((course, index) => (
                
                <tr className='border-b border-gray-500/20'>
                  {console.log("course:", course)}
                  <td className='md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3'>
                    <img src={course.courseThumbnail} className='w-14 sm:w-24' />
                    <div className='flex-1'>
                      <p className='mb-1 max-sm:text-sm'>{course.courseTitle}</p>
                      <Line strokeWidth={2} percent={progressArray[index] ?
                       (progressArray[index].lectureCompleted / progressArray[index].totalLectures * 100)
                      : 0 } className='bg-gray-300 rounded-full' />
                    </div>
                  </td>
                  <td className='px-4 py-3 max-sm:hidden'>
                    {caluclateCourseDuration(course)}
                  </td>
                  <td className='px-4 py-3 max-sm:hidden'>
                    {progressArray[index] 
                    && `${progressArray[index].lectureCompleted} / ${progressArray[index].totalLectures}`} <span>Lectures</span>
                  </td>
                  <td className='px-4 py-3 max-sm:text-right'>
                    <Link to={"/player/" + course.id}>
                    <button className='px-3 sm:px-5 py-1.5 sm:py-2 bg-blue-600 max-sm:text-xs
                    text-white'>
                      {progressArray[index] && 
                      (progressArray[index].lectureCompleted == progressArray[index].totalLectures ? "Completed" : "On Going") }
                      </button>
                      </Link>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  )
}

export default MyEnrollments
