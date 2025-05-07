"use client"
import { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import Link from 'next/link'

export default function ContentsCard() {
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        axios.get('/api/contents')
            .then(res => {
                if (Array.isArray(res.data.data)) {
                    setCount(res.data.data.length)
                } else if (Array.isArray(res.data)) {
                    setCount(res.data.length)
                }
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    return (
        <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Contenidos</h3>
                        <p className="text-3xl font-bold text-indigo-600 mt-2">
                            {loading ? '...' : count}
                        </p>
                    </div>
                    <Link
                        href="/contents"
                        className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 focus:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
                    >
                        Ver Contenidos
                    </Link>
                </div>
            </div>
        </div>
    )
} 