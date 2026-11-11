import { useState } from 'react'
import { Search, MessageCircle, UserRound, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import './Contacts.css'

const demoUsers = [
  { id: 1, name: 'Jonathan Mensah', username: '@jonathan', online: true },
  { id: 2, name: 'Emmanuel Mensah', username: '@emmanuel', online: true },
  { id: 3, name: 'Gabriel Kofi', username: '@gabriel', online: false },
  { id: 4, name: 'Lawrence Annor', username: '@lawrence', online: false },
]

export default function Contacts() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const filteredUsers = demoUsers.filter((user) =>
    `${user.name} ${user.username}`
      .toLowerCase()
      .includes(search.toLowerCase()),
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

          {filteredUsers.map((user) => (
            <div className="contact-card" key={user.id}>
              <div className="contact-avatar">
                {user.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>

              <div className="contact-info">
                <h3>{user.name}</h3>
                <p>{user.username}</p>
                <span className={user.online ? 'online' : 'offline'}>
                  ● {user.online ? 'Online' : 'Offline'}
                </span>
              </div>

              <button
                className="contact-message"
                onClick={() => navigate('/dashboard')}
                title="Open demo dashboard"
              >
                <MessageCircle size={18} />
                Message
              </button>
            </div>
          ))}

          {filteredUsers.length === 0 && (
            <p className="contacts-empty">No users found.</p>
          )}
        </div>
      </div>
    </main>
  )
}