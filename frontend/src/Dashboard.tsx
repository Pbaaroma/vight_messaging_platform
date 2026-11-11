import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  MessageCircle,
  Users,
  Settings,
  UserRound,
  Search,
  Plus,
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  CheckCheck,
  Phone,
  Video,
  Info,
} from 'lucide-react'
import './App.css'

type Message = {
  id: number
  text: string
  sender: 'me' | 'other'
  time: string
}

type Conversation = {
  id: number
  name: string
  initials: string
  color: string
  online: boolean
  messages: Message[]
}

const initialConversations: Conversation[] = [
  {
    id: 1,
    name: 'Jonathan Mensah',
    initials: 'JM',
    color: '#2563eb',
    online: true,
    messages: [
      {
        id: 1,
        text: 'Hey! How is the VIGHT project going?',
        sender: 'other',
        time: '10:02 PM',
      },
      {
        id: 2,
        text: "It's going well! I'm building the messaging interface.",
        sender: 'me',
        time: '10:05 PM',
      },
      {
        id: 3,
        text: 'Nice! Did you get the Rust backend working?',
        sender: 'other',
        time: '10:07 PM',
      },
      {
        id: 4,
        text: 'Not yet. I am finishing the frontend first.',
        sender: 'me',
        time: '10:10 PM',
      },
    ],
  },
  {
    id: 2,
    name: 'Emmanuel Mensah',
    initials: 'EM',
    color: '#7c3aed',
    online: true,
    messages: [
      {
        id: 1,
        text: 'I just pushed the latest code.',
        sender: 'other',
        time: '9:47 PM',
      },
    ],
  },
  {
    id: 3,
    name: 'Gabriel Kofi',
    initials: 'GK',
    color: '#0891b2',
    online: true,
    messages: [
      {
        id: 1,
        text: "Let's meet at the library.",
        sender: 'other',
        time: '8:31 PM',
      },
    ],
  },
  {
    id: 4,
    name: 'Lawrence Annor',
    initials: 'LA',
    color: '#ea580c',
    online: false,
    messages: [
      {
        id: 1,
        text: 'The network results look good!',
        sender: 'other',
        time: '7:16 PM',
      },
    ],
  },
]

function App() {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations)

  const [activeId, setActiveId] = useState(1)
  const [search, setSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')

  const navigate = useNavigate()
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  )

  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(search.toLowerCase()),
  )

  const sendMessage = () => {
    const text = messageInput.trim()

    if (!text || !activeConversation) return

    const newMessage: Message = {
      id: Date.now(),
      text,
      sender: 'me',
      time: new Date().toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
      }),
    }

    setConversations((previous) =>
      previous.map((conversation) =>
        conversation.id === activeId
          ? {
              ...conversation,
              messages: [...conversation.messages, newMessage],
            }
          : conversation,
      ),
    )

    setMessageInput('')
  }

  return (
    <div className="vight-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">V</div>

          <div>
            <h1>VIGHT</h1>
            <p>Connect. Chat. Stay Close.</p>
          </div>
        </div>

        <nav className="navigation">
          <button className="nav-item active" type="button">
            <MessageCircle size={20} />
            <span>Messages</span>
            <span className="notification-badge">3</span>
          </button>

          <button
            className="nav-item"
                type="button"
              onClick={() => navigate('/contacts')}
            >
          <Users size={20} />
          <span>Contacts</span>
          </button>

          <button className="nav-item" type="button">
            <UserRound size={20} />
            <span>Profile</span>
          </button>

          <button className="nav-item" type="button">
            <Settings size={20} />
            <span>Settings</span>
          </button>
        </nav>

        <button
          className="new-chat-button"
          type="button"
          onClick={() => navigate('/contacts')}
        >
          <Plus size={20} />
          New Conversation
        </button>

        <div className="conversation-section">
          <h2>Recent Conversations</h2>

          <div className="sidebar-search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="conversation-list">
            {filteredConversations.map((conversation) => {
              const lastMessage =
                conversation.messages[conversation.messages.length - 1]

              return (
                <button
                  key={conversation.id}
                  type="button"
                  className={`conversation-item ${
                    activeId === conversation.id ? 'selected' : ''
                  }`}
                  onClick={() => setActiveId(conversation.id)}
                >
                  <div
                    className="avatar"
                    style={{ background: conversation.color }}
                  >
                    {conversation.initials}

                    {conversation.online && (
                      <span className="online-dot" />
                    )}
                  </div>

                  <div className="conversation-details">
                    <div className="conversation-top">
                      <strong>{conversation.name}</strong>
                      <small>{lastMessage?.time}</small>
                    </div>

                    <p>{lastMessage?.text ?? 'No messages yet'}</p>
                  </div>
                </button>
              )
            })}

            {filteredConversations.length === 0 && (
              <p className="empty-search">No conversations found.</p>
            )}
          </div>
        </div>

        <div className="account">
          <div className="avatar account-avatar">D</div>

          <div className="account-details">
            <strong>VIGHT User</strong>
            <span>
              <span className="status-dot" />
              Online
            </span>
          </div>

          <MoreVertical size={20} />
        </div>
      </aside>

      <main className="chat-panel">
        <header className="topbar">
          <div className="topbar-search">
            <Search size={19} />
            <span>Search VIGHT...</span>
          </div>

          <div className="topbar-actions">
            <span className="topbar-status">VIGHT Messenger</span>
          </div>
        </header>

        {activeConversation ? (
          <>
            <div className="chat-header">
              <div className="chat-user">
                <div
                  className="avatar"
                  style={{ background: activeConversation.color }}
                >
                  {activeConversation.initials}
                </div>

                <div>
                  <h2>{activeConversation.name}</h2>

                  <p>
                    <span
                      className={`status-dot ${
                        activeConversation.online ? '' : 'offline'
                      }`}
                    />

                    {activeConversation.online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>

              <div className="chat-actions">
                <button type="button" title="Calls coming later" disabled>
                  <Phone size={21} />
                </button>

                <button type="button" title="Video coming later" disabled>
                  <Video size={21} />
                </button>

                <button type="button" title="Details coming later" disabled>
                  <Info size={21} />
                </button>
              </div>
            </div>

            <div className="messages-area">
              <div className="date-label">Today</div>

              {activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-row ${
                    message.sender === 'me' ? 'sent' : 'received'
                  }`}
                >
                  {message.sender === 'other' && (
                    <div
                      className="avatar message-avatar"
                      style={{ background: activeConversation.color }}
                    >
                      {activeConversation.initials}
                    </div>
                  )}

                  <div className="message-bubble">
                    <span>{message.text}</span>

                    <div className="message-meta">
                      <small>{message.time}</small>

                      {message.sender === 'me' && (
                        <CheckCheck size={15} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="composer">
              <button
                type="button"
                className="composer-icon"
                title="Attachments coming later"
                disabled
              >
                <Paperclip size={21} />
              </button>

              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') sendMessage()
                }}
              />

              <button
                type="button"
                className="composer-icon"
                title="Emoji picker coming later"
                disabled
              >
                <Smile size={21} />
              </button>

              <button
                type="button"
                className="send-button"
                onClick={sendMessage}
                aria-label="Add message to demo conversation"
              >
                <Send size={21} />
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            Select a conversation to get started.
          </div>
        )}
      </main>
    </div>
  )
}

export default App