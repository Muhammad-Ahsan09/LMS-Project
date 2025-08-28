import React from 'react'
import Navbar from '../../components/student/Navbar'
import Hero from '../../components/student/Hero'
import Searchbar from '../../components/student/SearchBar'
import Companies from '../../components/student/Companies'
import CourseSection from '../../components/student/CoursesSection'
import TestimonialsSection from '../../components/student/TestimonialsSection'
import CallToAction from '../../components/student/CallToAction'
import Footer from '../../components/student/Footer'

const Home = () => {
  return (
    <div className='flex flex-col items-center space-y-7 text-center'>
      <Hero />
      <Searchbar/>
      <Companies />
      <CourseSection />
      <TestimonialsSection />
      <CallToAction />
      <Footer />
    </div>
  )
}

export default Home
