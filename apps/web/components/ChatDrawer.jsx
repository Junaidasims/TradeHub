"use client";

import { useState, useEffect, useRef } from 'react';
import { X, Send, User } from 'lucide-react';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function ChatDrawer({ isOpen, onClose, recipientId, recipientName }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [convoId, setConvoId] = useState(null);
  const scrollRef = useRef(null);
  const convoIdRef = useRef(null);

  // Keep ref in sync for socket listener closure
  useEffect(() => {
    convoIdRef.current = convoId;
  }, [convoId]);

  // Open / create the conversation and load messages
  useEffect(() => {
    if (!isOpen || !recipientId || !user) return;

    const init = async () => {
      try {
        // Get or create conversation between current user and recipient
        const convoRes = await api.post('/conversations', { receiverId: recipientId });
        const id = convoRes.data._id;
        setConvoId(id);

        // Fetch existing messages
        const msgsRes = await api.get(`/conversations/${id}/messages`);
        setMessages(msgsRes.data.messages || []);

        // Mark as read
        await api.patch(`/conversations/${id}/read`);

        // Join socket room
        const socket = getSocket();
        if (socket) socket.emit('join_conversation', id);
      } catch (err) {
        console.error('ChatDrawer init error:', err);
      }
    };

    init();

    return () => {
      // Leave socket room on close
      const socket = getSocket();
      if (socket && convoIdRef.current) {
        socket.emit('leave_conversation', convoIdRef.current);
      }
      setMessages([]);
      setConvoId(null);
    };
  }, [isOpen, recipientId, user]);

  // Listen for real-time messages
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !convoId) return;

    const handleNewMsg = (msg) => {
      const incomingConvoId = msg.conversation?._id || msg.conversation;
      if (String(incomingConvoId) !== String(convoId)) return;
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => String(m._id) === String(msg._id))) return prev;
        return [...prev, msg];
      });
    };

    socket.on('new_message', handleNewMsg);
    return () => socket.off('new_message', handleNewMsg);
  }, [convoId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || loading || !convoId) return;

    const text = newMessage.trim();
    setNewMessage('');

    // Optimistic UI
    const optimistic = {
      _id: Date.now().toString(),
      sender: { _id: user._id, name: user.name },
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      setLoading(true);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('send_message', { conversationId: convoId, text });
      } else {
        // REST fallback
        await api.post('/messages', { conversationId: convoId, text });
      }
    } catch (err) {
      alert('Failed to send message');
      // Rollback optimistic
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setNewMessage(text);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentUserId = user?._id;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white border-l-4 border-black shadow-[-10px_0px_0px_0px_rgba(0,0,0,0.2)] z-50 flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="p-6 border-b-4 border-black bg-accent-teal text-white flex justify-between items-center shadow-[0px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-white rounded-full flex items-center justify-center bg-black/20">
            <User size={20} />
          </div>
          <div>
            <h3 className="font-black uppercase italic tracking-tighter leading-none">{recipientName}</h3>
            <p className="text-[10px] font-bold uppercase opacity-80 mt-1">Active Conversation</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-black/10 transition-colors">
          <X size={24} />
        </button>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-4 bg-cream scroll-smooth"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
            <div className="text-6xl mb-4">💬</div>
            <p className="font-black uppercase italic text-xs tracking-widest">No messages yet.<br />Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const senderId = msg.sender?._id || msg.sender;
            const isMine = String(senderId) === String(currentUserId);
            return (
              <div
                key={msg._id || i}
                className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`
                  max-w-[80%] p-4 border-2 border-black font-bold text-sm
                  shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
                  ${isMine
                    ? 'bg-accent-teal text-white rounded-tl-xl rounded-bl-xl rounded-br-sm'
                    : 'bg-white rounded-tr-xl rounded-br-xl rounded-bl-sm'}
                `}>
                  {msg.text || msg.content}
                  <div className={`text-[8px] mt-2 opacity-60 uppercase font-black ${isMine ? 'text-white text-right' : 'text-gray-500'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 border-t-4 border-black bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="input-neo flex-1 px-4 py-3"
            disabled={!convoId}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim() || !convoId}
            className="btn-neo bg-black text-white p-3 disabled:opacity-50"
          >
            <Send size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}
