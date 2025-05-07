'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import axios from '@/lib/axios'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const wsMessages = [
    'Conectando al WebSocket...',
    'Esperando transmisión...',
    'Transmisión iniciada',
    'Recibiendo datos...',
    'Procesando contenido...',
    'Transmisión finalizada',
    'Desconectado del WebSocket',
]

export default function ContentPreview() {
    const params = useParams()
    const { id } = params
    const [content, setContent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [wsIndex, setWsIndex] = useState(0)

    useEffect(() => {
        axios.get(`/api/contents/${id}`)
            .then(res => {
                setContent(res.data)
                setLoading(false)
            })
            .catch(() => {
                setError('No se pudo cargar el contenido')
                setLoading(false)
            })
    }, [id])

    // Simulación de mensajes WebSocket
    useEffect(() => {
        const timer = setTimeout(() => {
            setWsIndex((prev) => (prev + 1) % wsMessages.length)
        }, 2000)
        return () => clearTimeout(timer)
    }, [wsIndex])

    if (loading) return <div className="p-6">Cargando...</div>
    if (error) return <div className="p-6 text-red-500">{error}</div>
    if (!content) return <div className="p-6">No hay datos</div>

    // Corrige la URL del archivo
    const fileUrl = content.file_url && content.file_url.startsWith('/storage')
        ? backendUrl + content.file_url
        : content.file_url

    return (
        <div className="max-w-2xl mx-auto py-10">
            <h1 className="text-2xl font-bold mb-4">{content.title}</h1>
            <p className="mb-2 text-gray-700">{content.description}</p>
            <div className="mb-6">
                {content.type === 'video' && fileUrl.endsWith('.mp4') ? (
                    <video src={fileUrl} controls width={500} />
                ) : fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver archivo</a>
                ) : (
                    <span>No hay archivo disponible</span>
                )}
            </div>
            <div className="bg-yellow-100 text-yellow-800 p-4 rounded flex items-center gap-3">
                <span className="animate-pulse">●</span>
                <span><strong>Simulación WebSocket:</strong> {wsMessages[wsIndex]}</span>
            </div>
        </div>
    )
} 