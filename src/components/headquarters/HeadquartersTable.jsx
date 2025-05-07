import { useState, useEffect } from 'react'
import axios from '@/lib/axios'
import Loader from '@/components/Loader'

export default function HeadquartersTable() {
    const [headquarters, setHeadquarters] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [form, setForm] = useState({
        name: '',
        location: '',
        description: '',
    })
    const [editing, setEditing] = useState(null)
    const [message, setMessage] = useState(null)

    useEffect(() => {
        fetchHeadquarters()
    }, [])

    const fetchHeadquarters = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await axios.get('/api/headquarters')
            console.log('Respuesta de la API:', res.data)
            if (Array.isArray(res.data)) {
                setHeadquarters(res.data)
            } else if (Array.isArray(res.data.data)) {
                setHeadquarters(res.data.data)
            } else {
                setHeadquarters([])
            }
        } catch (err) {
            setError('Error al cargar las sedes')
        }
        setLoading(false)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        try {
            if (editing) {
                await axios.put(`/api/headquarters/${editing.id}`, form)
                setMessage('Sede actualizada correctamente')
            } else {
                await axios.post('/api/headquarters', form)
                setMessage('Sede creada correctamente')
            }
            setForm({ name: '', location: '', description: '' })
            setEditing(null)
            fetchHeadquarters()
        } catch (err) {
            setError('Error al guardar la sede')
        }
    }

    const handleEdit = (hq) => {
        setEditing(hq)
        setForm({
            name: hq.name || '',
            location: hq.location || '',
            description: hq.description || '',
        })
    }

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta sede?')) return
        try {
            await axios.delete(`/api/headquarters/${id}`)
            setMessage('Sede eliminada correctamente')
            fetchHeadquarters()
        } catch (err) {
            setError('Error al eliminar la sede')
        }
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold">Sedes</h2>
            {message && <div className="bg-green-100 text-green-700 p-2 rounded">{message}</div>}
            {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow flex flex-col sm:flex-row flex-wrap gap-4 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Nombre</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        required
                    />
                </div>
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium">Ubicación</label>
                    <input
                        type="text"
                        className="mt-1 block w-full border rounded p-2"
                        value={form.location}
                        onChange={e => setForm({ ...form, location: e.target.value })}
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
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                    {editing ? 'Actualizar' : 'Crear'}
                </button>
                {editing && (
                    <button
                        type="button"
                        className="ml-2 bg-gray-300 px-4 py-2 rounded hover:bg-gray-400"
                        onClick={() => {
                            setEditing(null)
                            setForm({ name: '', location: '', description: '' })
                        }}
                    >
                        Cancelar
                    </button>
                )}
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
                                <th className="px-4 py-2">Nombre</th>
                                <th className="px-4 py-2">Ubicación</th>
                                <th className="px-4 py-2">Descripción</th>
                                <th className="px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(headquarters) && headquarters.length > 0 ? (
                                headquarters.map(hq => (
                                    <tr key={hq.id} className="border-t">
                                        <td className="px-4 py-2">{hq.id}</td>
                                        <td className="px-4 py-2">{hq.name}</td>
                                        <td className="px-4 py-2">{hq.location}</td>
                                        <td className="px-4 py-2">{hq.description}</td>
                                        <td className="px-4 py-2 flex gap-2">
                                            <button
                                                className="bg-yellow-400 text-white px-2 py-1 rounded hover:bg-yellow-500"
                                                onClick={() => handleEdit(hq)}
                                            >
                                                Editar
                                            </button>
                                            <button
                                                className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                onClick={() => handleDelete(hq.id)}
                                            >
                                                Eliminar
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                !loading && (
                                    <tr>
                                        <td colSpan={5} className="text-center py-4">No hay sedes registradas.</td>
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