'use client'
import { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import Loader from '@/components/Loader'
import { useRouter } from 'next/navigation'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export default function ContentsTable() {
    const [contents, setContents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        title: '',
        file: null,
        description: '',
        type: '',
    })
    const [message, setMessage] = useState(null)
    const [filterType, setFilterType] = useState('')
    const [search, setSearch] = useState('')
    const [editing, setEditing] = useState(null)
    const [wsStatus, setWsStatus] = useState({}) // Estado simulado de WebSocket
    const router = useRouter()

    useEffect(() => {
        fetchContents()
    }, [])

    const fetchContents = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.get('/api/contents')
            if (Array.isArray(res.data.data)) {
                setContents(res.data.data)
            } else if (Array.isArray(res.data)) {
                setContents(res.data)
            } else {
                setContents([])
            }
        } catch (err) {
            setError('Error al cargar los contenidos')
        }
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        const formData = new FormData()
        formData.append('title', form.title)
        formData.append('description', form.description)
        formData.append('type', form.type)
        if (form.file) formData.append('file', form.file)

        try {
            await axios.post('/api/contents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setMessage('Contenido subido correctamente')
            setForm({ title: '', file: null, description: '', type: '' })
            fetchContents()
        } catch (err) {
            setError('Error al subir el contenido')
        }
    }

    const handleEdit = (content) => {
        setForm({
            title: content.title || '',
            file: null, // No se puede editar el archivo directamente
            description: content.description || '',
            type: content.type || '',
        })
        setEditing(content.id)
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este contenido?')) return
        try {
            await axios.delete(`/api/contents/${id}`)
            setMessage('Contenido eliminado correctamente')
            fetchContents()
        } catch (err) {
            setError('Error al eliminar el contenido')
        }
    }

    // Simulación de WebSocket
    const simulateWebSocket = (id) => {
        const estados = ['En reproducción', 'En espera', 'Error', 'Finalizado']
        const random = estados[Math.floor(Math.random() * estados.length)]
        setWsStatus(prev => ({ ...prev, [id]: random }))
        // Redirigir a la vista de transmisión simulada
        router.push(`/contents/${id}/preview`)
    }

    // Filtros
    const filteredContents = contents.filter(content => {
        const matchesType = filterType ? content.type === filterType : true
        const matchesSearch = search ? content.title.toLowerCase().includes(search.toLowerCase()) : true
        return matchesType && matchesSearch
    })

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Contenidos</h2>
            {message && <div className="bg-green-100 text-green-700 p-2 rounded">{message}</div>}
            {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow flex flex-col sm:flex-row flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Título</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        required
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Tipo</label>
                    <select
                        className="mt-1 block w-full border rounded p-2"
                        value={form.type}
                        onChange={e => setForm({ ...form, type: e.target.value })}
                        required
                    >
                        <option value="">Selecciona el tipo</option>
                        <option value="video">Video</option>
                        <option value="image">Imagen</option>
                        <option value="audio">Audio</option>
                        <option value="text">Texto</option>
                    </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Archivo</label>
                    <input
                        type="file"
                        className="mt-1 block w-full"
                        onChange={e => setForm({ ...form, file: e.target.files[0] })}
                        required
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Descripción</label>
                    <textarea
                        className="mt-1 block w-full border rounded p-2"
                        value={form.description}
                        onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                </div>
                <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                >
                    Subir
                </button>
            </form>

            {/* Filtros */}
            <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded shadow">
                <div>
                    <label className="block text-xs font-medium">Filtrar por tipo</label>
                    <select
                        className="mt-1 block border rounded p-2"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                    >
                        <option value="">Todos</option>
                        <option value="video">Video</option>
                        <option value="image">Imagen</option>
                        <option value="audio">Audio</option>
                        <option value="text">Texto</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium">Buscar por título</label>
                    <input
                        type="text"
                        className="mt-1 block border rounded p-2"
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Tabla */}
            <div className="overflow-x-auto">
                {loading ? (
                    <Loader />
                ) : (
                    <table className="min-w-full bg-white rounded shadow">
                        <thead>
                            <tr>
                                <th className="px-4 py-2">ID</th>
                                <th className="px-4 py-2">Título</th>
                                <th className="px-4 py-2">Tipo</th>
                                <th className="px-4 py-2">Descripción</th>
                                <th className="px-4 py-2">Archivo</th>
                                <th className="px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(filteredContents) && filteredContents.length > 0 ? (
                                filteredContents.map(content => {
                                    const fileUrl = content.file_url && content.file_url.startsWith('/storage')
                                        ? backendUrl + content.file_url
                                        : content.file_url;
                                    return (
                                        <tr key={content.id} className="border-t">
                                            <td className="px-4 py-2">{content.id}</td>
                                            <td className="px-4 py-2">{content.title}</td>
                                            <td className="px-4 py-2">{content.type}</td>
                                            <td className="px-4 py-2">{content.description}</td>
                                            <td className="px-4 py-2">
                                                {fileUrl && content.type === 'video' && fileUrl.endsWith('.mp4') ? (
                                                    <video src={fileUrl} controls width={200} />
                                                ) : fileUrl ? (
                                                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver archivo</a>
                                                ) : 'No disponible'}
                                            </td>
                                            <td className="px-4 py-2 flex gap-2">
                                                <button
                                                    className="bg-yellow-400 text-white px-2 py-1 rounded hover:bg-yellow-500"
                                                    onClick={() => handleEdit(content)}
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                    onClick={() => handleDelete(content.id)}
                                                >
                                                    Eliminar
                                                </button>
                                                <button
                                                    className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                                                    onClick={() => simulateWebSocket(content.id)}
                                                    type="button"
                                                >
                                                    Simular WS
                                                </button>
                                                <span className={`ml-2 text-xs px-2 py-1 rounded 
                                                    ${wsStatus && wsStatus[content.id] === 'En reproducción' ? 'bg-green-100 text-green-700' :
                                                      wsStatus && wsStatus[content.id] === 'Error' ? 'bg-red-100 text-red-700' :
                                                      wsStatus && wsStatus[content.id] === 'Finalizado' ? 'bg-gray-100 text-gray-700' :
                                                      wsStatus && wsStatus[content.id] === 'En espera' ? 'bg-yellow-100 text-yellow-700' :
                                                      'bg-gray-50 text-gray-400'}`}>
                                                    {(wsStatus && wsStatus[content.id]) || 'Sin estado'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                !loading && (
                                    <tr>
                                        <td colSpan={6} className="text-center py-4">No hay contenidos registrados.</td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
} 