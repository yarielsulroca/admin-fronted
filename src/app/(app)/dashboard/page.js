// src/app/(app)/dashboard/page.js
'use client'

import { useState } from 'react'
import Header from '@/app/(app)/Header'
import ClientsCard from '@/components/dashboard/cards/ClientsCard'
import HeadquartersCard from '@/components/dashboard/cards/HeadquartersCard'
import ScreensCard from '@/components/dashboard/cards/ScreensCard'
import ContentsCard from '@/components/dashboard/cards/ContentsCard'

const Dashboard = () => {
    const [loadedComponents, setLoadedComponents] = useState({
        clients: false,
        headquarters: false,
        screens: false,
        contents: false
    })

    // Función para marcar un componente como cargado
    const handleComponentLoad = (component) => {
        setLoadedComponents(prev => ({
            ...prev,
            [component]: true
        }))
    }

    return (
        <div>
            <Header title="Dashboard" />
            
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <ClientsCard onLoad={() => handleComponentLoad('clients')} />
                        <HeadquartersCard onLoad={() => handleComponentLoad('headquarters')} />
                        <ScreensCard onLoad={() => handleComponentLoad('screens')} />
                        <ContentsCard onLoad={() => handleComponentLoad('contents')} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard