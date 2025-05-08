import { Nunito } from 'next/font/google'
import '@/app/global.css'
import Script from 'next/script'

const nunitoFont = Nunito({
    subsets: ['latin'],
    display: 'swap',
})

export const metadata = {
    title: 'Panel de Administración',
    description: 'Sistema de gestión de contenido',
}

const RootLayout = ({ children }) => {
    return (
        <html lang="es" className={nunitoFont.className}>
            <head>
                <meta charSet="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <Script src="/assets/js/main.js" strategy="beforeInteractive" />
                <Script src="/assets/js/index.js" strategy="beforeInteractive" />
            </head>
            <body className="antialiased bg-gray-100">{children}</body>
        </html>
    )
}

export default RootLayout
