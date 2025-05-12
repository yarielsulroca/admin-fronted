import ApplicationLogo from '@/components/ApplicationLogo'
import Dropdown from '@/components/Dropdown'
import Link from 'next/link'
import NavLink from '@/components/NavLink'
import ResponsiveNavLink, {
    ResponsiveNavButton,
} from '@/components/ResponsiveNavLink'
import { DropdownButton } from '@/components/DropdownLink'
import { useAuth } from '@/hooks/auth'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const Navigation = ({ user, children }) => {
    const { logout } = useAuth()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(true)

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className={`bg-gray-800 text-white w-64 ${sidebarOpen ? 'block' : 'hidden'} md:block flex-shrink-0`}>
                {/* Sidebar Header */}
                <div className="px-4 py-5 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                        <Link href="/dashboard" className="text-white">
                            <ApplicationLogo className="h-8 w-auto fill-current text-white" />
                        </Link>
                        <button 
                            onClick={() => setSidebarOpen(false)}
                            className="md:hidden text-gray-400 hover:text-white"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="mt-2">
                        <div className="text-sm font-medium text-gray-300">{user?.name}</div>
                        <div className="text-xs text-gray-400">{user?.email}</div>
                    </div>
                </div>

                {/* Sidebar Navigation */}
                <nav className="mt-5 px-2">
                    <div className="space-y-1">
                        <Link 
                            href="/dashboard" 
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname === '/dashboard' 
                                    ? 'bg-gray-900 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <svg 
                                className={`mr-3 h-5 w-5 ${
                                    pathname === '/dashboard' 
                                        ? 'text-gray-300' 
                                        : 'text-gray-400 group-hover:text-gray-300'
                                }`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" 
                                />
                            </svg>
                            Dashboard
                        </Link>

                        <Link 
                            href="/clients" 
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname.startsWith('/clients') 
                                    ? 'bg-gray-900 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <svg 
                                className={`mr-3 h-5 w-5 ${
                                    pathname.startsWith('/clients') 
                                        ? 'text-gray-300' 
                                        : 'text-gray-400 group-hover:text-gray-300'
                                }`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" 
                                />
                            </svg>
                            Clientes
                        </Link>

                        <Link 
                            href="/headquarters" 
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname.startsWith('/headquarters') 
                                    ? 'bg-gray-900 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <svg 
                                className={`mr-3 h-5 w-5 ${
                                    pathname.startsWith('/headquarters') 
                                        ? 'text-gray-300' 
                                        : 'text-gray-400 group-hover:text-gray-300'
                                }`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
                                />
                            </svg>
                            Sucursales
                        </Link>

                        <Link 
                            href="/contents" 
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname.startsWith('/contents') 
                                    ? 'bg-gray-900 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <svg 
                                className={`mr-3 h-5 w-5 ${
                                    pathname.startsWith('/contents') 
                                        ? 'text-gray-300' 
                                        : 'text-gray-400 group-hover:text-gray-300'
                                }`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                                />
                            </svg>
                            Contenidos
                        </Link>

                        <Link 
                            href="/websocket-test" 
                            className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                                pathname === '/websocket-test' 
                                    ? 'bg-gray-900 text-white' 
                                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }`}
                        >
                            <svg 
                                className={`mr-3 h-5 w-5 ${
                                    pathname === '/websocket-test' 
                                        ? 'text-gray-300' 
                                        : 'text-gray-400 group-hover:text-gray-300'
                                }`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                            >
                                <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2" 
                                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" 
                                />
                            </svg>
                            WebSocket Test
                        </Link>
                    </div>
                </nav>

                {/* Logout button */}
                <div className="mt-auto border-t border-gray-700 p-4 absolute bottom-0 w-full">
                    <button 
                        onClick={logout}
                        className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                        <svg 
                            className="mr-3 h-5 w-5 text-gray-400" 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                        >
                            <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="2" 
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                            />
                        </svg>
                        Cerrar Sesión
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header */}
                <div className="md:hidden bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between px-4 py-2">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="text-gray-500 hover:text-gray-600 focus:outline-none"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <Link href="/dashboard">
                            <ApplicationLogo className="h-8 w-auto fill-current text-gray-600" />
                        </Link>
                        <div>
                            <Dropdown
                                align="right"
                                width="48"
                                trigger={
                                    <button className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 focus:outline-none transition duration-150 ease-in-out">
                                        <div>{user?.name}</div>
                                        <div className="ml-1">
                                            <svg
                                                className="fill-current h-4 w-4"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 20 20">
                                                <path
                                                    fillRule="evenodd"
                                                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                    </button>
                                }>
                                <DropdownButton onClick={logout}>
                                    Cerrar Sesión
                                </DropdownButton>
                            </Dropdown>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default Navigation