import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const loading = () => {
  return (
    <div>
     <Skeleton className="h-12 w-[500px] rounded-sm bg-[#232429] mb-4" />
    <Skeleton className="h-[300px] w-full rounded-sm bg-[#232429]" />
    </div>
  )
}

export default loading