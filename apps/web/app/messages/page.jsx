"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Send, ArrowLeft, Check, X, Package, Sparkles } from 'lucide-react';

// Parse rental offer from message text
function parseRentalOffer(text) {
  const match = text?.match(/\[rental-offer:([a-f0-9]+)\]/);
  if (!match) return null;
  return { rentalId: match[1] };
}

// Parse wishlist offer from message text
function parseWishlistOffer(text) {
  const match = text?.match(/\[wishlist-offer:([a-f0-9]+)\]/);
  if (!match) return null;
  // Extract the clean display parts
  const displayText = text.replace(/🔗 \[wishlist-offer:[a-f0-9]+\]/, '').trim();
  return { requestId: match[1], displayText };
}

// Helper to get ID as string regardless of object/string or _id/id
const normalizeId = (id) => {
  if (!id) return null;
  if (typeof id === 'string') return id;
  if (id._id) return String(id._id);
  if (id.id) return String(id.id);
  return String(id);
};

function MessagesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [typing, setTyping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offerStates, setOfferStates] = useState({}); // { requestId: 'pending'|'accepted'|'declined' }
  const [rentalDetails, setRentalDetails] = useState({}); // { rentalId: details }
  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [isGeneratingReplies, setIsGeneratingReplies] = useState(false);
  const [negotiateTip, setNegotiateTip] = useState('');
  const [negotiateLoading, setNegotiateLoading] = useState(false);
  const scrollRef = useRef(null);
  const typingTimeout = useRef(null);
  const activeConvoRef = useRef(null);

  // Keep ref in sync
  useEffect(() => {
    activeConvoRef.current = activeConvo;
  }, [activeConvo]);

  // Fetch conversations
  useEffect(() => {
    const fetchConvos = async () => {
      try {
        const res = await api.get('/conversations');
        setConversations(res.data);
        // Auto-open if convo param exists
        const convoId = searchParams.get('convo');
        if (convoId) {
          const c = res.data.find(c => c._id === convoId);
          if (c) setActiveConvo(c);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (user) fetchConvos();
  }, [user, searchParams]);

  // Fetch messages when active convo changes
  useEffect(() => {
    if (!activeConvo) return;
    const fetchMsgs = async () => {
      try {
        const res = await api.get(`/conversations/${activeConvo._id}/messages`);
        setMessages(res.data.messages || []);
        // Mark as read
        await api.patch(`/conversations/${activeConvo._id}/read`);

        // Check offer states for any wishlist offer messages
        const msgs = res.data.messages || [];
        for (const msg of msgs) {
          const offer = parseWishlistOffer(msg.text);
          if (offer) {
            try {
              const statusRes = await api.get(`/wishlist/${offer.requestId}/status`);
              setOfferStates(prev => ({ ...prev, [offer.requestId]: statusRes.data.status }));
            } catch (e) { /* ignore */ }
          }
          
          const rentalOffer = parseRentalOffer(msg.text);
          if (rentalOffer) {
            try {
              const rentalRes = await api.get(`/rentals/${rentalOffer.rentalId}`);
              setRentalDetails(prev => ({ ...prev, [rentalOffer.rentalId]: rentalRes.data }));
            } catch (e) { console.error(e); }
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchMsgs();
  }, [activeConvo]);

  // Global Socket Listeners (Independent of active conversation)

  // Trigger smart replies generation when messages change and last message is from other user
  useEffect(() => {
    if (!messages || messages.length === 0 || !user || !activeConvo) return;
    
    const lastMessage = messages[messages.length - 1];
    const isFromMe = normalizeId(lastMessage.sender) === normalizeId(user);
    
    if (isFromMe) {
      setSuggestedReplies([]); // clear replies if I just sent a message
      return;
    }

    const generateReplies = async () => {
      try {
        setIsGeneratingReplies(true);
        // Get last 5 messages for context
        const recentMessages = messages.slice(-5).map(m => ({
          sender: normalizeId(m.sender) === normalizeId(user) ? 'Me' : 'Other',
          text: m.text
        }));

        const res = await api.post('/ai/smart-replies', { context: recentMessages });
        if (res.data && res.data.replies) {
          setSuggestedReplies(res.data.replies);
        }
      } catch (err) {
        console.error('Failed to generate smart replies:', err);
      } finally {
        setIsGeneratingReplies(false);
      }
    };

    // Add a tiny delay so it feels natural
    const timer = setTimeout(generateReplies, 500);
    return () => clearTimeout(timer);
  }, [messages, user, activeConvo]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    const handleGlobalNewMsg = (msg) => {
      const incomingSenderId = normalizeId(msg.sender);
      const incomingMsgId = normalizeId(msg._id);
      const incomingConvoId = normalizeId(msg.conversation);
      const currentUserId = normalizeId(user);

      // (A) Update the specific conversation's messages IF it's the active one
      const activeConvoId = normalizeId(activeConvoRef.current);
      if (incomingConvoId === activeConvoId) {
        setMessages(prev => {
          if (prev.some(m => normalizeId(m._id) === incomingMsgId)) return prev;

          // Replace optimistic
          if (incomingSenderId === currentUserId) {
            const optimisticIndex = prev.findIndex(m => {
              const isTempId = m._id && m._id.length < 15 && !isNaN(m._id);
              const sameText = m.text?.trim() === msg.text?.trim();
              const sameSender = normalizeId(m.sender) === incomingSenderId;
              return isTempId && sameText && sameSender;
            });
            if (optimisticIndex !== -1) {
              const updated = [...prev];
              updated[optimisticIndex] = msg;
              return updated;
            }
          }
          return [...prev, msg];
        });
        setTyping(null);
      }

      // (B) Update the sidebar for ALL messages
      setConversations(prev => {
        const index = prev.findIndex(c => normalizeId(c._id) === incomingConvoId);
        if (index === -1) return prev; // Potentially fetch new convo here if needed
        
        const updated = [...prev];
        const convo = updated[index];
        const isCurrentActive = incomingConvoId === activeConvoId;
        
        updated[index] = {
          ...convo,
          lastMessage: msg.text,
          lastTimestamp: msg.createdAt,
          unreadCount: {
            ...convo.unreadCount,
            [currentUserId]: isCurrentActive ? 0 : (convo.unreadCount?.[currentUserId] || 0) + 1
          }
        };
        // Move to top
        const item = updated.splice(index, 1)[0];
        updated.unshift(item);
        return updated;
      });
    };

    const handleTyping = (data) => {
      if (normalizeId(data.conversationId) === normalizeId(activeConvoRef.current?._id)) {
        if (data.userId !== user?._id) setTyping(data.name);
      }
    };
    const handleStopTyping = (data) => {
      if (normalizeId(data.conversationId) === normalizeId(activeConvoRef.current?._id)) {
        if (data.userId !== user?._id) setTyping(null);
      }
    };

    const handleUnreadUpdate = (data) => {
      setConversations(prev => prev.map(c => 
        normalizeId(c._id) === normalizeId(data.conversationId) 
          ? { ...c, unreadCount: { ...c.unreadCount, [normalizeId(user)]: data.count } }
          : c
      ));
    };

    const handleMsgDeleted = (data) => {
      setMessages(prev => prev.filter(m => normalizeId(m._id) !== normalizeId(data.messageId)));
    };

    socket.on('new_message', handleGlobalNewMsg);
    socket.on('unread_count_updated', handleUnreadUpdate);
    socket.on('message_deleted', handleMsgDeleted);
    socket.on('user_typing', handleTyping);
    socket.on('user_stopped_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleGlobalNewMsg);
      socket.off('unread_count_updated', handleUnreadUpdate);
      socket.off('message_deleted', handleMsgDeleted);
      socket.off('user_typing', handleTyping);
      socket.off('user_stopped_typing', handleStopTyping);
    };
  }, [user]);

  // Handle joining room when active convo changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeConvo) return;
    socket.emit('join_conversation', activeConvo._id);
    return () => {
      socket.emit('leave_conversation', activeConvo._id);
    };
  }, [activeConvo]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, typing]);

  // Accept/Decline rental offer
  const handleRentalAction = async (rentalId, action) => {
    try {
      if (action === 'accept') {
        await api.patch(`/rentals/${rentalId}/approve`);
        setRentalDetails(prev => ({ ...prev, [rentalId]: { ...prev[rentalId], status: 'active' } }));
        await api.post('/messages', {
          conversationId: activeConvo._id,
          text: `✅ I've accepted your rental request! Please arrange for pickup.`
        });
      } else {
        await api.patch(`/rentals/${rentalId}/reject`);
        setRentalDetails(prev => ({ ...prev, [rentalId]: { ...prev[rentalId], status: 'rejected' } }));
        await api.post('/messages', {
          conversationId: activeConvo._id,
          text: `❌ I'm sorry, I have to decline this rental request.`
        });
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed');
    }
  };

  // Accept/Decline wishlist offer
  const handleOfferAction = async (requestId, action) => {
    try {
      if (action === 'accept') {
        // Find the offer associated with the sender in this conversation
        const statusRes = await api.get(`/wishlist/${requestId}/status`);
        const offerId = statusRes.data.offerId;
        if (offerId) {
          await api.patch(`/wishlist/${requestId}/fulfill`, { offerId });
        }
        setOfferStates(prev => ({ ...prev, [requestId]: 'fulfilled' }));
        // Send confirmation message
        await api.post('/messages', {
          conversationId: activeConvo._id,
          text: `✅ I've accepted your wishlist offer! Let's coordinate the details.`
        });
      } else {
        await api.patch(`/wishlist/${requestId}/decline-offer`, {
          conversationId: activeConvo._id
        });
        setOfferStates(prev => ({ ...prev, [requestId]: 'declined' }));
        // Send decline message
        await api.post('/messages', {
          conversationId: activeConvo._id,
          text: `❌ I've declined this offer. Thanks anyway!`
        });
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed');
    }
  };

  const handleNegotiateTip = async () => {
    if (!activeConvo || !messages.length) return;
    setNegotiateLoading(true);
    setNegotiateTip('');
    try {
      const itemMsg = messages.find(m => m.itemContext);
      const itemTitle = itemMsg?.itemContext?.title || activeConvo.lastMessage || 'this item';
      const recentContext = messages.slice(-5).map(m => ({
        sender: normalizeId(m.sender) === normalizeId(user) ? 'Me' : 'Other',
        text: m.text
      }));
      const res = await api.post('/ai/negotiate-tip', {
        itemTitle,
        listedPrice: itemMsg?.itemContext?.price,
        context: recentContext
      });
      setNegotiateTip(res.data.tip || '');
    } catch {
      setNegotiateTip('Could not generate a tip right now. Try again.');
    } finally {
      setNegotiateLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;

    const socket = getSocket();
    const currentUserId = normalizeId(user);
    const optimistic = {
      _id: Date.now().toString(),
      sender: { _id: currentUserId, name: user.name },
      text: newMsg,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimistic]);
    setNewMsg('');

    if (socket?.connected) {
      socket.emit('send_message', { conversationId: activeConvo._id, text: newMsg });
      socket.emit('typing_stop', { conversationId: activeConvo._id });
    } else {
      await api.post('/messages', { conversationId: activeConvo._id, text: newMsg });
    }
  };

  const handleInputChange = (e) => {
    setNewMsg(e.target.value);
    const socket = getSocket();
    if (!socket) return;
    socket.emit('typing_start', { conversationId: activeConvo._id, name: user.name });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing_stop', { conversationId: activeConvo._id });
    }, 1500);
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.delete(`/messages/${msgId}`);
      // State will be updated via socket listener
    } catch (err) {
      alert('Failed to delete message');
    }
  };

  const getOtherUser = (convo) => convo.participants?.find(p => p._id !== user?._id);

  // Render a message bubble — handles wishlist offers specially
  const renderMessage = (msg, i) => {
    const senderId = normalizeId(msg.sender);
    const currentUserId = normalizeId(user);
    const isMine = senderId && currentUserId && senderId === currentUserId;
    
    const rentalOffer = parseRentalOffer(msg.text);
    if (rentalOffer) {
      const details = rentalDetails[rentalOffer.rentalId];
      if (!details) return null; // loading state
      
      const isOwner = details.owner?._id === currentUserId || details.owner === currentUserId;
      const canAct = isOwner && details.status === 'pending';

      return (
        <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-2xl border border-gray-200 dark:border-darkBorder shadow-sm overflow-hidden bg-white dark:bg-darkCard text-gray-800 dark:text-gray-100`}>
            <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase border-b border-gray-100 dark:border-darkBorder bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal dark:text-accent-teal`}>
              <Package size={14} /> Rental Request
            </div>
            <div className="p-4 flex gap-4 items-center">
               {details.listing?.images?.[0] ? (
                 <img src={details.listing.images[0]} alt="Item" className="w-16 h-16 object-cover rounded-lg shadow-sm" />
               ) : (
                 <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs font-medium text-gray-400 dark:text-gray-500">No Img</div>
               )}
               <div>
                 <h4 className="font-semibold text-lg leading-tight truncate w-40">{details.listing?.title || 'Item'}</h4>
                 <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total: ₹{details.totalCost}</p>
                 <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Requested by {details.renter?.name}</p>
               </div>
            </div>
            {canAct && (
              <div className="border-t border-gray-100 dark:border-darkBorder flex">
                <button onClick={() => handleRentalAction(rentalOffer.rentalId, 'accept')}
                  className="flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors border-r border-gray-100 dark:border-darkBorder">
                  <Check size={14} /> Accept
                </button>
                <button onClick={() => handleRentalAction(rentalOffer.rentalId, 'decline')}
                  className="flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors">
                  <X size={14} /> Decline
                </button>
              </div>
            )}
            {details.status === 'active' && (
              <div className="border-t border-gray-100 dark:border-darkBorder bg-green-50 dark:bg-green-500/10 py-2 px-4 text-center">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                  <Check size={14} /> Request Approved
                </span>
              </div>
            )}
            {details.status === 'rejected' && (
              <div className="border-t border-gray-100 dark:border-darkBorder bg-red-50 dark:bg-red-500/10 py-2 px-4 text-center">
                <span className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center justify-center gap-1">
                  <X size={14} /> Request Declined
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }

    const offer = parseWishlistOffer(msg.text);

    if (offer) {
      const state = offerStates[offer.requestId];
      const canAct = !isMine && (state === 'open' || !state);

      return (
        <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-[80%] rounded-2xl border border-gray-100 dark:border-darkBorder shadow-sm overflow-hidden
            ${isMine ? 'bg-gradient-to-br from-accent-teal to-accent-cyan text-white' : 'bg-white dark:bg-darkCard text-gray-800 dark:text-gray-100'}`}>
            <div className={`px-4 py-2 flex items-center gap-2 text-xs font-semibold uppercase border-b border-white/20 dark:border-darkBorder
              ${isMine ? 'bg-black/10' : 'bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal dark:text-accent-teal border-gray-100'}`}>
              <Package size={14} /> Wishlist Offer
            </div>
            <div className="p-4">
              <div className="text-sm font-medium whitespace-pre-line">{offer.displayText}</div>
              <div className={`text-[9px] mt-2 opacity-70 ${isMine ? 'text-right' : ''}`}>
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {canAct && (
              <div className="border-t border-gray-100 dark:border-darkBorder flex">
                <button onClick={() => handleOfferAction(offer.requestId, 'accept')}
                  className="flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1 bg-green-50 dark:bg-green-500/10 hover:bg-green-100 dark:hover:bg-green-500/20 text-green-600 dark:text-green-400 transition-colors border-r border-gray-100 dark:border-darkBorder">
                  <Check size={14} /> Accept
                </button>
                <button onClick={() => handleOfferAction(offer.requestId, 'decline')}
                  className="flex-1 py-3 font-semibold text-xs flex items-center justify-center gap-1 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-500 dark:text-red-400 transition-colors">
                  <X size={14} /> Decline
                </button>
              </div>
            )}
            {state === 'fulfilled' && (
              <div className="border-t border-gray-100 dark:border-darkBorder bg-green-50 dark:bg-green-500/10 py-2 px-4 text-center">
                <span className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                  <Check size={14} /> Offer Accepted
                </span>
              </div>
            )}
            {state === 'declined' && (
              <div className="border-t border-gray-100 dark:border-darkBorder bg-red-50 dark:bg-red-500/10 py-2 px-4 text-center">
                <span className="text-xs font-semibold text-red-500 dark:text-red-400 flex items-center justify-center gap-1">
                  <X size={14} /> Offer Declined
                </span>
              </div>
            )}
            {state === 'closed' && (
              <div className="border-t border-gray-100 dark:border-darkBorder bg-gray-50 dark:bg-slate-800 py-2 px-4 text-center">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Request Closed</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Regular message
    return (
      <div key={msg._id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
        <div className={`max-w-[75%] px-4 py-2.5 text-sm font-medium relative shadow-sm
          ${isMine ? 'bg-gradient-to-br from-accent-teal to-accent-cyan text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-darkCard border border-gray-200 dark:border-darkBorder text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm'}`}>
          {msg.itemContext && (
            <div className="text-[10px] uppercase font-semibold mb-1 opacity-80 flex items-center gap-1 border-b border-white/20 dark:border-gray-600 pb-1">
              <Package size={10} /> Re: {msg.itemContext.title || 'Item'}
            </div>
          )}
          {msg.text}
          <div className={`text-[9px] mt-1 opacity-70 ${isMine ? 'text-right text-white/80' : 'text-gray-400 dark:text-gray-400'}`}>
            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {isMine && (
            <button onClick={() => handleDeleteMessage(msg._id)}
              className="absolute -top-2 -left-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} />
            </button>
          )}
        </div>
      </div>
    );
  };


  if (!user) return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200"><Navbar />
      <div className="container mx-auto px-4 py-20 text-center font-semibold text-gray-500 dark:text-gray-400">Please log in to view messages</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-10">
      <Navbar />
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-darkCard rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder overflow-hidden" style={{ height: 'calc(100vh - 120px)' }}>
          <div className="flex h-full">

            {/* Conversation List */}
            <div className={`w-full md:w-96 border-r border-gray-100 dark:border-darkBorder flex flex-col bg-gray-50/50 dark:bg-darkBg/50 ${activeConvo ? 'hidden md:flex' : 'flex'}`}>
              <div className="p-5 border-b border-gray-100 dark:border-darkBorder bg-white dark:bg-darkCard">
                <h2 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">Messages</h2>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-4 space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 animate-pulse rounded-xl" />)}
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-8 text-center mt-10">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-2xl mb-4 mx-auto">📪</div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No conversations yet</p>
                  </div>
                ) : conversations.map(convo => {
                  const other = getOtherUser(convo);
                  const unread = convo.unreadCount?.[user._id] || 0;
                  return (
                    <button key={convo._id} onClick={() => setActiveConvo(convo)}
                      className={`w-full text-left p-4 border-b border-gray-100 dark:border-darkBorder hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-3
                        ${activeConvo?._id === convo._id ? 'bg-white dark:bg-slate-800 border-l-4 border-l-accent-teal shadow-sm z-10' : ''}`}>
                      <div className="w-12 h-12 rounded-full bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal dark:text-accent-teal flex items-center justify-center font-bold text-lg shrink-0">
                        {other?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 truncate">{other?.name}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium shrink-0">
                            {convo.lastTimestamp ? new Date(convo.lastTimestamp).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate pr-2">{convo.lastMessage || 'No messages'}</p>
                          {unread > 0 && (
                            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 shadow-sm">{unread}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Window */}
            <div className={`flex-1 flex flex-col bg-white dark:bg-darkCard ${!activeConvo ? 'hidden md:flex' : 'flex'}`}>
              {!activeConvo ? (
                <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-darkBg/50">
                  <div className="text-center opacity-50 hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-3xl mb-4 mx-auto">💬</div>
                    <p className="font-medium text-gray-500 dark:text-gray-400">Select a conversation to start chatting</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-darkBorder bg-white dark:bg-darkCard flex items-center gap-4">
                    <button onClick={() => { setActiveConvo(null); setNegotiateTip(''); }} className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors"><ArrowLeft size={20} /></button>
                    <div className="w-10 h-10 rounded-full bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal dark:text-accent-teal flex items-center justify-center font-bold text-lg">
                      {getOtherUser(activeConvo)?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-white">{getOtherUser(activeConvo)?.name}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">Online</p>
                    </div>
                    <button
                      onClick={handleNegotiateTip}
                      disabled={negotiateLoading || messages.length === 0}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase rounded-lg border-2 border-orange-300 dark:border-orange-500/40 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {negotiateLoading
                        ? <><Sparkles size={12} className="animate-pulse" /> Thinking…</>
                        : <><Sparkles size={12} /> Negotiate</>
                      }
                    </button>
                  </div>

                  {/* Negotiate Tip Banner */}
                  {negotiateTip && (
                    <div className="mx-4 mt-3 px-4 py-3 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 flex items-start gap-3">
                      <Sparkles size={14} className="text-orange-500 shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 leading-relaxed flex-1">{negotiateTip}</p>
                      <button onClick={() => setNegotiateTip('')} className="text-orange-400 hover:text-orange-600 transition-colors shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {/* Messages */}
                  <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 dark:bg-darkBg/30">
                    {messages.map((msg, i) => renderMessage(msg, i))}
                    {typing && (
                      <div className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-darkBorder rounded-2xl rounded-tl-sm px-4 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2 shadow-sm">
                          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Smart Replies */}
                  {(suggestedReplies.length > 0 || isGeneratingReplies) && (
                    <div className="px-6 py-3 bg-white dark:bg-darkCard border-t border-gray-100 dark:border-darkBorder flex items-center gap-2 overflow-x-auto hide-scrollbar">
                      {isGeneratingReplies ? (
                        <div className="flex items-center gap-2 text-xs font-semibold text-accent-teal dark:text-accent-teal animate-pulse bg-accent-teal/5 dark:bg-accent-teal/10 px-4 py-2 rounded-full">
                          <Sparkles size={14} /> AI is thinking...
                        </div>
                      ) : (
                        suggestedReplies.map((reply, idx) => (
                          <button
                            key={idx}
                            onClick={() => setNewMsg(reply)}
                            className="shrink-0 bg-white dark:bg-darkCard border border-accent-teal/20 dark:border-accent-teal/30 px-4 py-2 text-sm font-medium text-accent-teal dark:text-accent-teal hover:bg-accent-teal dark:hover:bg-accent-teal hover:text-white dark:hover:text-white transition-all rounded-full shadow-sm"
                          >
                            {reply}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Input */}
                  <div className="p-4 border-t border-gray-100 dark:border-darkBorder bg-white dark:bg-darkCard">
                    <form onSubmit={handleSend} className="flex gap-3 max-w-4xl mx-auto">
                      <input type="text" value={newMsg} onChange={handleInputChange}
                        placeholder="Type your message..." className="input-neo flex-1 dark:bg-slate-800 dark:border-darkBorder dark:text-white" />
                      <button type="submit" disabled={!newMsg.trim()}
                        className="bg-accent-teal hover:bg-accent-teal/90 text-white h-[50px] w-[50px] rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:hover:bg-accent-teal shadow-md">
                        <Send size={20} />
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream dark:bg-darkBg flex items-center justify-center font-semibold text-gray-500 dark:text-gray-400">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
