import { useEffect, useState } from 'react'
import api from './services/api'

function App() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    api.get('/ping')
      .then(res => setMessage(res.data.message))
      .catch(() => setMessage('API connection failed'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <h1 className="text-3xl font-bold text-blue-600">{message}</h1>
    </div>
  )
}

export default App