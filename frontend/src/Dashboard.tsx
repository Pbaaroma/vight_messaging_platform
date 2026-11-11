import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
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
  id: string
  text: string
  sender: 'me' | 'other'
  time: string
}
type DatabaseMessage = {
  _id?: {
    $oid?: string
  }
  sender: string
  receiver: string
  content: string
  createdAt?: {
    $date?: {
      $numberLong?: string
    }
  }
  created_at?: string
  status?: string
}

type Conversation = {
  id: number
  userId: string
  name: string
  initials: string
  color: string
  online: boolean
  messages: Message[]
}

const initialConversations: Conversation[] = [
  {
    id: 1,
    userId: 'client_b',
    name: 'Jonathan Mensah',
    initials: 'JM',
    color: '#2563eb',
    online: true,
    messages: [  ],
  },
  {
    id: 2,
    userId: 'client_c',
    name: 'Emmanuel Mensah',
    initials: 'EM',
    color: '#7c3aed',
    online: true,
    messages: [],
  },
  {
    userId: 'client_d',
    id: 3,
    name: 'Gabriel Kofi',
    initials: 'GK',
    color: '#0891b2',
    online: true,
    messages: [],
  },
  {
    userId: 'client_e',
    id: 4,
    name: 'Lawrence Annor',
    initials: 'LA',
    color: '#ea580c',
    online: false,
    messages: [],
  },
]

const CURRENT_USER = 'client_a'

function formatMessageTime(timestamp?: string) {
  if (!timestamp) return ''

  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function convertDatabaseMessage(
  message: DatabaseMessage,
): Message {
  const mongoTimestamp =
    message.createdAt?.$date?.$numberLong

  const timestamp = mongoTimestamp
    ? new Date(Number(mongoTimestamp)).toISOString()
    : message.created_at

  return {
    id: message._id?.$oid ?? crypto.randomUUID(),
    text: message.content,
    sender: message.sender === CURRENT_USER ? 'me' : 'other',
    time: formatMessageTime(timestamp),
  }
}


function App() {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations)

  const [activeId, setActiveId] = useState(1)
  const [search, setSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const websocketRef = useRef<WebSocket | null>(null)

const [connectionStatus, setConnectionStatus] =
  useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const navigate = useNavigate()
  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeId,
  )
useEffect(() => {
  const protocol =
    window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  const socket = new WebSocket(
    `${protocol}//${window.location.host}/ws`,
  )

  websocketRef.current = socket

  socket.onopen = () => {
    if (websocketRef.current !== socket) return

    console.log('VIGHT WebSocket connected')
    setConnectionStatus('connected')
  }

  socket.onmessage = (event) => {
  if (websocketRef.current !== socket) return

  try {
    const message = JSON.parse(event.data) as DatabaseMessage

    if (
      message.sender !== CURRENT_USER &&
      message.receiver !== CURRENT_USER
    ) {
      return
    }

    const convertedMessage = convertDatabaseMessage(message)

    setConversations((previous) =>
      previous.map((conversation) => {
        const belongsToConversation =
          (message.sender === CURRENT_USER &&
            message.receiver === conversation.userId) ||
          (message.sender === conversation.userId &&
            message.receiver === CURRENT_USER)

        if (!belongsToConversation) return conversation

        if (
          conversation.messages.some(
            (existing) => existing.id === convertedMessage.id,
          )
        ) {
          return conversation
        }

        return {
          ...conversation,
          messages: [
            ...conversation.messages,
            convertedMessage,
          ],
        }
      }),
    )

    console.log('VIGHT live message received:', message)
  } catch (error) {
    console.error('Invalid VIGHT message:', error)
  }
}
  socket.onerror = () => {
    if (websocketRef.current !== socket) return

    console.error('VIGHT WebSocket connection error')
  }

  socket.onclose = () => {
    if (websocketRef.current !== socket) return

    console.log('VIGHT WebSocket disconnected')
    websocketRef.current = null
    setConnectionStatus('disconnected')
  }

  return () => {
    if (websocketRef.current === socket) {
      websocketRef.current = null
    }

    socket.close()
  }
}, [])

  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(search.toLowerCase()),
  )

useEffect(() => {
  const controller = new AbortController()

  async function loadMessages() {
    try {
      const response = await fetch('/api/messages', {
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to load messages')
      }

      const messages =
        (await response.json()) as DatabaseMessage[]

      setConversations((previous) =>
        previous.map((conversation) => {
          const conversationMessages = messages
            .filter(
              (message) =>
                (message.sender === CURRENT_USER &&
                  message.receiver === conversation.userId) ||
                (message.sender === conversation.userId &&
                  message.receiver === CURRENT_USER),
            )
            .map(convertDatabaseMessage)

          return {
            ...conversation,
            messages: conversationMessages,
          }
        }),
      )

      console.log('VIGHT message history loaded')
    } catch (error) {
      if (controller.signal.aborted) return

      console.error('Failed to load VIGHT history:', error)
    }
  }

  loadMessages()

  return () => controller.abort()
}, [])

  const sendMessage = () => {
    const text = messageInput.trim()

    if (!text || !activeConversation) return

    const socket = websocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert('VIGHT is disconnected. Please check the backend server.')
      return
    }

  const message = {
      sender: CURRENT_USER,
      receiver: activeConversation.userId,
      content: text,
    }

    socket.send(JSON.stringify(message))

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
            <span className="topbar-status">
              VIGHT Messenger - {connectionStatus}
              </span>
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