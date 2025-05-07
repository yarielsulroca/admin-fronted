// src/app/(app)/dashboard/page.js
import Header from '@/app/(app)/Header'
import ClientsCard from '@/components/dashboard/cards/ClientsCard'
import HeadquartersCard from '@/components/dashboard/cards/HeadquartersCard'
import ScreensCard from '@/components/dashboard/cards/ScreensCard'
import ContentsCard from '@/components/dashboard/cards/ContentsCard'

const Dashboard = () => {
    return (
        <>
            <Header title="Panel de Administración" />
            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ClientsCard />
                        <HeadquartersCard />
                        <ScreensCard />
                        <ContentsCard />
                    </div>
                </div>
            </div>
        </>
    )
}

export default Dashboard