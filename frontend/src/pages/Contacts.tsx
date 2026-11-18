import { useEffect, useState } from 'react'
import { Search, MessageCircle, UserRound, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Contacts.css'

type ContactUser = {
  user_id: string
  name: string
}


export default function Contacts() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const [users, setUsers] = useState<ContactUser[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  const controller = new AbortController()

  async function loadUsers() {
    try {
      const response = await fetch('/api/users', {
        credentials: 'include',
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to load registered users')
      }

      const data = (await response.json()) as ContactUser[]
      setUsers(data)
    } catch (err) {
      if (controller.signal.aborted) return

      console.error(err)
      setError('Unable to load contacts.')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  loadUsers()

  return () => controller.abort()
}, [])

  const filteredUsers = users.filter((user) =>
  user.name.toLowerCase().includes(search.toLowerCase()),
)

  return (
    <main className="contacts-page">
      <div className="contacts-container">
   
        <button
  className="contacts-back"
  onClick={() => navigate('/dashboard')}
>
  <ArrowLeft size={18} />
  Back to Messages
</button>

        <header className="contacts-header">
          <div className="contacts-icon">
            <UserRound size={28} />
          </div>

          <h1>Find People</h1>
          <p>Discover people and start conversations on VIGHT.</p>
        </header>

        <div className="contacts-search">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name or username..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

      <div className="contacts-results">
  <h2>People on VIGHT</h2>

  {loading && <p>Loading VIGHT members...</p>}

  {error && <p role="alert">{error}</p>}

  {filteredUsers.map((user) => (
    <div className="contact-card" key={user.user_id}>
      <div className="contact-avatar">
        {user.name
          .split(' ')
          .map((part) => part[0])
          .join('')}
      </div>

      <div className="contact-info">
        <h3>{user.name}</h3>
        <p>VIGHT Member</p>
      </div>

      <button
        className="contact-message"
        onClick={() =>
          navigate(
            `/dashboard?contact=${encodeURIComponent(user.user_id)}`
          )
        }
        title={`Message ${user.name}`}
      >
        <MessageCircle size={18} />
        Message
      </button>
    </div>
  ))}

  {!loading && !error && filteredUsers.length === 0 && (
    <p className="contacts-empty">No users found.</p>
  )}
</div>
      </div>
    </main>
  )
}