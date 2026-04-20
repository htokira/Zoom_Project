import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
const API = 'http://localhost:3000/api'
const user = JSON.parse(localStorage.getItem('user') || '{}')
const CURRENT_USER_ID = user.id

export default function ChatsPage() {
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
    <>
        {unreadCount > 0 && (
            <div style={{
                position: 'fixed',
                top: '10px',
                right: '10px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                zIndex: 1000
            }}>
                {unreadCount}
            </div>
        )}
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif' }}>
            <div style={{ width: '300px', borderRight: '1px solid #ddd', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h2>Чати</h2>
                <input
                    type="text"
                    placeholder="Назва чату"
                    value={chatName}
                    onChange={e => setChatName(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                <input
                    type="text"
                    placeholder="Ніки учасників через кому: Oksana, Oleksii"
                    value={memberUsernames}
                    onChange={e => setMemberUsernames(e.target.value)}
                    style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
                {chatError && <p style={{ color: 'red', fontSize: '13px' }}>{chatError}</p>}
                <button
                    onClick={handleCreateChat}
                    style={{ padding: '8px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    Створити чат
                </button>
                {chats.map((chat: any) => (
                    <div
                        key={chat.id}
                        onClick={() => handleSelectChat(chat.id)}
                        style={{
                            padding: '10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: selectedChat === chat.id ? '#e0e7ff' : '#f3f4f6'
                        }}
                    >
                        {chat.name || `Чат #${chat.id}`}
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {!selectedChat && <p style={{ color: '#999' }}>Оберіть чат</p>}
                    {messages.map((msg: any, index) => (
                        <div key={index} style={{
                            alignSelf: msg.senderId === CURRENT_USER_ID ? 'flex-end' : 'flex-start',
                            maxWidth: '60%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ fontSize: '11px', color: '#999', marginBottom: '2px', textAlign: msg.senderId === CURRENT_USER_ID ? 'right' : 'left' }}>
                                {msg.sender?.username || msg.username || 'Юзер'}
                            </div>
                            <div style={{
                                background: msg.senderId === CURRENT_USER_ID ? '#4f46e5' : '#f3f4f6',
                                color: msg.senderId === CURRENT_USER_ID ? 'white' : 'black',
                                padding: '8px 12px',
                                borderRadius: '12px',
                            }}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {selectedChat && (
                    <div style={{ padding: '16px', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="Повідомлення..."
                            value={newMessage}
                            onChange={e => setNewMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '10px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            📎
                        </button>
                        <button
                            onClick={handleSendMessage}
                            style={{ padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Надіслати
                        </button>
                    </div>
                )}
            </div>
        </div>
    </>
)
}