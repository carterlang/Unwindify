
"use client"
import React from 'react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const redirectUser = () => {
  const router = useRouter();
  useEffect(() => {
    setTimeout(() => {
      router.push("/home-page");
    }, 3000)
  }, [])
  return (
    <div>Loading...</div>
  )
}

export default redirectUser