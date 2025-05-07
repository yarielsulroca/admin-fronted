'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from '@/lib/axios'

const ScreensCard = () => {
    const [screenCount, setScreenCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchScreenCount = async () => {
            try {
                const response = await axios.get('/api/clients')
                if (response.data?.data?.length) {
                    const activeScreens = response.data.data.filter(screen => screen.is_allowed)
                    setScreenCount(activeScreens.length)
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error al obtener la cantidad de pantallas')
            } finally {
                setLoading(false)
            }
        }

        fetchScreenCount()
    }, [])

    if (loading) {
        return (
            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg p-6">
                <div className="text-red-500">
                    Error: {error}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Pantallas Activas</h3>
                        <p className="text-3xl font-bold text-purple-600 mt-2">{screenCount}</p>
                    </div>
                    <Link 
                        href="/screens"
                        className="inline-flex items-center px-4 py-2 bg-purple-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-purple-700 focus:bg-purple-700 active:bg-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Ver Pantallas
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default ScreensCard