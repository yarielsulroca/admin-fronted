'use client'

import { useState, useEffect } from 'react'

export default function DashboardLoader() {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer)
                    return 100
                }
                return prev + 10
            })
        }, 200)

        return () => clearInterval(timer)
    }, [])

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 shadow-xl">
                <div className="flex flex-col items-center">
                    {/* Logo o ícono animado */}
                    <div className="w-16 h-16 mb-4">
                        <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Cargando Panel de Administración
                    </h3>

                    {/* Barra de progreso */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Mensaje de estado */}
                    <p className="text-sm text-gray-500">
                        {progress < 100 ? 'Cargando componentes...' : 'Completado'}
                    </p>
                </div>
            </div>
        </div>
    )
} 