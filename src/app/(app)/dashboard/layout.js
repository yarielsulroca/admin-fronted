'use client'

import { useState, useEffect } from 'react'
import DashboardLoader from '@/components/dashboard/DashboardLoader'

export default function DashboardLayout({ children }) {
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Simular tiempo de carga de componentes
        const timer = setTimeout(() => {
            setIsLoading(false)
        }, 2000) // 2 segundos de carga simulada

        return () => clearTimeout(timer)
    }, [])

    return (
        <>
            {isLoading && <DashboardLoader />}
            <div className={isLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-500'}>
                {children}
            </div>
        </>
    )
}