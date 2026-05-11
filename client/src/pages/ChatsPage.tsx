import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
const API = 'http://localhost:3000/api'

export default function ChatsPage() {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const CURRENT_USER_ID = user.id
    const [chats, setChats] = useState<any[]>([])
    const [messages, setMessages] = useState<any[]>([])
    const [selectedChat, setSelectedChat] = useState<number | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [chatName, setChatName] = useState('')
    const [unreadCount, setUnreadCount] = useState(0)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [memberUsernames, setMemberUsernames] = useState('')
    const [chatError, setChatError] = useState('')

    useEffect(() => {
        if (socket.connected) {
            socket.emit('joinUser', CURRENT_USER_ID)
        } else {
            socket.on('connect', () => {
                socket.emit('joinUser', CURRENT_USER_ID)
            })
        }

        socket.on('receiveMessage', (data) => {
            setMessages(prev => [...prev, data])
        })

        socket.on('notification', () => {
            setUnreadCount(prev => prev + 1)
        })

        socket.on('newChat', async () => {
            const updated = await axios.get(`${API}/chats/${CURRENT_USER_ID}`)
            setChats(updated.data)
        })

        axios.get(`${API}/chats/${CURRENT_USER_ID}`)
            .then(res => setChats(res.data))
            .catch(err => console.error(err))

        return () => {
            socket.off('receiveMessage')
            socket.off('notification')
            socket.off('connect')
        }
    }, [])

    async function handleCreateChat() {
        try {
            setChatError('')
            if (!chatName.trim()) {
                setChatError('Введіть назву чату')
                return
            }
            if (!memberUsernames.trim()) {
                setChatError('Додайте хоча б одного учасника')
                return
            }
            const usernames = memberUsernames.split(',').map(u => u.trim()).filter(u => u)
            const memberIds = [CURRENT_USER_ID]
            for (const username of usernames) {
                const res = await axios.get(`${API}/auth/users/search?username=${username}`)
                const found = res.data.find((u: any) => u.username === username)
                if (!found) {
                    setChatError(`Юзера "${username}" не знайдено`)
                    return
                }
                if (found.id !== CURRENT_USER_ID) {
                    memberIds.push(found.id)
                }
            }
            await axios.post(`${API}/chats`, { name: chatName, memberIds })
            const updated = await axios.get(`${API}/chats/${CURRENT_USER_ID}`)
            setChats(updated.data)
            setChatName('')
            setMemberUsernames('')
        } catch (err) {
            console.error(err)
        }
    }
    async function handleSelectChat(chatId: number) {
        setSelectedChat(chatId)
        setUnreadCount(0)
        socket.emit('joinChat', chatId)
        const res = await axios.get(`${API}/chats/${chatId}/messages`)
        setMessages(res.data)
    }
    function handleSendMessage() {
        if (!selectedChat || !newMessage.trim()) return
        socket.emit('sendMessage', {
            chatId: selectedChat,
            senderId: CURRENT_USER_ID,
            username: user.username,
            text: newMessage
        })
        setNewMessage('')
    }
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file || !selectedChat) return
        e.target.value = ''
        try {
            const msgRes = await axios.post(`${API}/messages`, {
                chatId: selectedChat,
                senderId: CURRENT_USER_ID,
                text: `📎 ${file.name}`
            })
            const messageId = msgRes.data.id
            const formData = new FormData()
            formData.append('file', file)
            formData.append('messageId', String(messageId))
            await axios.post(`${API}/files/upload`, formData)
            socket.emit('sendMessage', {
                chatId: selectedChat,
                senderId: CURRENT_USER_ID,
                username: user.username,
                text: newMessage
            })
        } catch (err) {
            console.error('Помилка завантаження файлу:', err)
        }
    }
    return (
    <div className="page-container">
        {unreadCount > 0 && (
            <div className="badge">
                {unreadCount}
            </div>
        )}
        <div className="chat-layout">
            <div className="chat-sidebar">
                <h2 className="page-title" style={{margin: 0, textAlign: 'left'}}>Чати</h2>
                <div className="form-group" style={{marginBottom: '10px'}}>
                    <input
                        type="text"
                        placeholder="Назва чату"
                        value={chatName}
                        onChange={e => setChatName(e.target.value)}
                        className="dashboard-input"
                    />
                    <input
                        type="text"
                        placeholder="Ніки учасників: Oksana, Oleksii"
                        value={memberUsernames}
                        onChange={e => setMemberUsernames(e.target.value)}
                        className="dashboard-input"
                    />
                    {chatError && <p style={{ color: '#d93025', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>{chatError}</p>}
                    <button onClick={handleCreateChat} className="dash-btn primary-btn">
                        Створити чат
                    </button>
                </div>
                {chats.map((chat: any) => (
                    <div
                        key={chat.id}
                        onClick={() => handleSelectChat(chat.id)}
                        className={selectedChat === chat.id ? "chat-sidebar-item chat-sidebar-item-active" : "chat-sidebar-item"}
                    >
                        {chat.name || `Чат #${chat.id}`}
                    </div>
                ))}
            </div>

            <div className="chat-main">
                {selectedChat && <h2 className="chat-header">Чат: {chats.find(c => c.id === selectedChat)?.name || `#${selectedChat}`}</h2>}
                <div className="chat-messages">
                    {!selectedChat && <p style={{ color: '#1a4f76', textAlign: 'center', marginTop: '40px', fontSize: '18px' }}>Оберіть чат для спілкування</p>}
                    {messages.map((msg: any, index) => (
                        <div key={index} className={msg.senderId === CURRENT_USER_ID ? "message-wrapper message-mine" : "message-wrapper message-other"}>
                            <div className="message-sender">
                                {msg.sender?.username || msg.username || 'Юзер'}
                            </div>
                            <div className="message-bubble">
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedChat && (
                    <div className="chat-input-area">
                        <input
                            type="text"
                            placeholder="Повідомлення..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            className="dashboard-input"
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <button onClick={() => fileInputRef.current?.click()} className="icon-btn">
                            📎
                        </button>
                        <button onClick={handleSendMessage} className="dash-btn primary-btn" style={{width: 'auto', padding: '0 30px'}}>
                            Надіслати
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
)
}