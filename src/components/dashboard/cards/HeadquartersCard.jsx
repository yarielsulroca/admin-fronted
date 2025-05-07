'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import axios from '@/lib/axios'

const HeadquartersCard = () => {
    const [headquartersCount, setHeadquartersCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchHeadquartersCount = async () => {
            try {
                const response = await axios.get('/api/clients')
                if (response.data?.data?.length) {
                    const headquarters = new Set(
                        response.data.data
                            .map(client => {
                                const match = client.name.match(/- (.*?) -/)
                                return match ? match[1].trim() : null
                            })
                            .filter(Boolean)
                    )
                    setHeadquartersCount(headquarters.size)
                }
            } catch (err) {
                setError(err.response?.data?.message || 'Error al obtener la cantidad de sedes')
            } finally {
                setLoading(false)
            }
        }

        fetchHeadquartersCount()
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
                        <h3 className="text-lg font-semibold text-gray-900">Sedes Activas</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">{headquartersCount}</p>
                    </div>
                    <Link 
                        href="/headquarters"
                        className="inline-flex items-center px-4 py-2 bg-green-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-green-700 focus:bg-green-700 active:bg-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Ver Sedes
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default HeadquartersCard