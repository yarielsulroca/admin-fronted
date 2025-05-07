'use client'
import { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import Loader from '@/components/Loader'

export default function ContentsTable() {
    const [contents, setContents] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        title: '',
        file: null,
        description: '',
    })
    const [message, setMessage] = useState(null)

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
        if (form.file) formData.append('file', form.file)

        try {
            await axios.post('/api/contents', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            setMessage('Contenido subido correctamente')
            setForm({ title: '', file: null, description: '' })
            fetchContents()
        } catch (err) {
            setError('Error al subir el contenido')
        }
    }

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
                                <th className="px-4 py-2">Descripción</th>
                                <th className="px-4 py-2">Archivo</th>
                                <th className="px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(contents) && contents.length > 0 ? (
                                contents.map(content => (
                                    <tr key={content.id} className="border-t">
                                        <td className="px-4 py-2">{content.id}</td>
                                        <td className="px-4 py-2">{content.title}</td>
                                        <td className="px-4 py-2">{content.description}</td>
                                        <td className="px-4 py-2">
                                            {content.file_url ? (
                                                <a href={content.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Ver archivo</a>
                                            ) : 'No disponible'}
                                        </td>
                                        <td className="px-4 py-2">
                                            {/* Aquí puedes agregar botones de editar/eliminar si lo deseas */}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                !loading && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">No hay contenidos registrados.</td>
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