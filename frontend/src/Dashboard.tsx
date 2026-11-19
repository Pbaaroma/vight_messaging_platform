import { useNavigate, useSearchParams } from 'react-router-dom'
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
  LogOut,
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

type AuthenticatedUser = {
  user_id: string
  name: string
  email: string
}

type ContactUser = {
  user_id: string
  name: string
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
  currentUserId: string,
): Message {
  const mongoTimestamp =
    message.createdAt?.$date?.$numberLong

  const timestamp = mongoTimestamp
    ? new Date(Number(mongoTimestamp)).toISOString()
    : message.created_at

  return {
    id: message._id?.$oid ?? crypto.randomUUID(),
    text: message.content,
    sender: message.sender === currentUserId ? 'me' : 'other',
    time: formatMessageTime(timestamp),
  }
}


function App() {
  const [conversations, setConversations] =
    useState<Conversation[]>([])

const [activeId, setActiveId] = useState<number | null>(null)

const [currentUser, setCurrentUser] =
  useState<AuthenticatedUser | null>(null)

const [searchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [messageInput, setMessageInput] = useState('')
  const websocketRef = useRef<WebSocket | null>(null)

const [connectionStatus, setConnectionStatus] =
  useState<'connecting' | 'connected' | 'disconnected'>('connecting')

  const navigate = useNavigate()

  const [loggingOut, setLoggingOut] = useState(false)
useEffect(() => {
  const controller = new AbortController()

  async function loadDashboardUsers() {
    try {
      const [meResponse, usersResponse] = await Promise.all([
        fetch('/api/auth/me', {
          credentials: 'include',
          signal: controller.signal,
        }),
        fetch('/api/users', {
          credentials: 'include',
          signal: controller.signal,
        }),
      ])

      if (!meResponse.ok || !usersResponse.ok) {
        throw new Error('Unable to load VIGHT users')
      }

      const me = (await meResponse.json()) as AuthenticatedUser
      const users = (await usersResponse.json()) as ContactUser[]

      if (controller.signal.aborted) return

      setCurrentUser(me)

      const realConversations: Conversation[] = users.map(
        (user, index) => ({
          id: index + 1,
          userId: user.user_id,
          name: user.name,
          initials: user.name
            .split(' ')
            .map((part) => part[0])
            .join('')
            .slice(0, 2)
            .toUpperCase(),
          color: ['#2563eb', '#7c3aed', '#0891b2', '#ea580c'][
            index % 4
          ],
          online: false,
          messages: [],
        }),
      )

      setConversations(realConversations)
     setActiveId(realConversations[0]?.id ?? null)

      console.log('VIGHT registered users loaded')
    } catch (error) {
      if (controller.signal.aborted) return

      console.error('VIGHT dashboard loading error:', error)
    }
  }

  loadDashboardUsers()

  return () => controller.abort()
}, [])



async function handleLogout() {
  if (loggingOut) return

  setLoggingOut(true)

  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Logout failed')
    }

    websocketRef.current?.close()
    websocketRef.current = null

    navigate('/login', { replace: true })
  } catch (error) {
    console.error('VIGHT logout error:', error)
    alert('Unable to log out. Please try again.')
  } finally {
    setLoggingOut(false)
  }
}


  const requestedContact = searchParams.get('contact')

const activeConversation =
  conversations.find(
    (conversation) => conversation.userId === requestedContact,
  ) ??
  conversations.find(
    (conversation) => conversation.id === activeId,
  )

useEffect(() => {
  if (!currentUser) return
  
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
      message.sender !== currentUser?.user_id &&
      message.receiver !== currentUser?.user_id
    ) {
      return
    }

   const convertedMessage = convertDatabaseMessage(
  message,
  currentUser.user_id,
)
    setConversations((previous) =>
      previous.map((conversation) => {
        const belongsToConversation =
          (message.sender === currentUser.user_id &&
            message.receiver === conversation.userId) ||
          (message.sender === conversation.userId &&
            message.receiver === currentUser.user_id)

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
    setConnectionStatus('disconnected')
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
}, [currentUser])

  const filteredConversations = conversations.filter((conversation) =>
    conversation.name.toLowerCase().includes(search.toLowerCase()),
  )

useEffect(() => {
  if (!currentUser) return

  const currentUserId = currentUser.user_id
  const controller = new AbortController()

  async function loadMessages() {
    try {
      const response = await fetch('/api/messages', {
        credentials: 'include',
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
                (message.sender === currentUserId &&
                  message.receiver === conversation.userId) ||
                (message.sender === conversation.userId &&
                  message.receiver === currentUserId),
            )
            .map((message) =>
    convertDatabaseMessage(message, currentUserId),
          )
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
}, [currentUser])

  const sendMessage = () => {
    const text = messageInput.trim()

    if (!text || !activeConversation) return

    const socket = websocketRef.current

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      alert('VIGHT is disconnected. Please check the backend server.')
      return
    }

  const message = {
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

          <button
  className="nav-item"
  type="button"
  onClick={handleLogout}
  disabled={loggingOut}
>
  <LogOut size={20} />
  <span>{loggingOut ? 'Logging Out...' : 'Logout'}</span>
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
                    activeConversation?.id === conversation.id ? 'selected' : ''
                  }`}
                  onClick={() => {
  setActiveId(conversation.id)
  navigate('/dashboard', { replace: true })
}}
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