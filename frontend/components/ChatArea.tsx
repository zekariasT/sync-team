'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@clerk/nextjs';
import { io, Socket } from 'socket.io-client';
import { Send, Hash, Smile, Menu } from 'lucide-react';
import ViewHeader from './ViewHeader';

interface Message {
  id: string;
  content: string;
  senderId: string;
  channelId: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface ChatAreaProps {
  channelId: string;
  channelName?: string;
  onMenuClick?: () => void;
}

export default function ChatArea({ channelId, channelName, onMenuClick }: ChatAreaProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch messages and set up WebSocket
  useEffect(() => {
    setLoading(true);
    setMessages([]);

    // Fetch existing messages
    fetch(`http://localhost:3001/chat/channels/${channelId}/messages`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setMessages(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Set up WebSocket for real-time messages
    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    socket.emit('joinChannel', channelId);

    socket.on('newMessage', (data: Message) => {
      if (data.channelId === channelId) {
        setMessages(prev => [...prev, data]);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [channelId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch(`http://localhost:3001/chat/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: user.id,
          content,
        }),
      });

      if (res.ok) {
        const savedMessage = await res.json();
        // The WebSocket will broadcast it back, but we add it optimistically
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === savedMessage.id)) return prev;
          return [...prev, savedMessage];
        });
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Group messages by date
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach(msg => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const existing = groupedMessages.find(g => g.date === dateKey);
    if (existing) {
      existing.msgs.push(msg);
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] });
    }
  });

  return (
    <div className="flex-1 flex flex-col h-screen bg-background overflow-hidden">
      <ViewHeader 
        title={channelName || 'Channel'} 
        Icon={Hash}
        onMenuClick={onMenuClick || (() => {})}
      />

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-5 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary/20 border-t-secondary rounded-full animate-spin" />
              <p className="text-xs text-primary/40 font-mono">LOADING MESSAGES...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Hash size={48} className="mx-auto text-primary/15 mb-4" />
              <h3 className="text-lg font-bold text-text mb-1">Welcome to #{channelName || 'channel'}</h3>
              <p className="text-sm text-primary/50">This is the beginning of the conversation. Say hello! 👋</p>
            </div>
          </div>
        ) : (
          <>
            {groupedMessages.map(group => (
              <div key={group.date}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-primary/10" />
                  <span className="text-[10px] font-bold text-primary/40 uppercase tracking-wider px-2 py-1 bg-primary/5 rounded-full">
                    {formatDate(group.msgs[0].createdAt)}
                  </span>
                  <div className="flex-1 h-px bg-primary/10" />
                </div>

                {/* Messages in this date group */}
                {group.msgs.map((msg, i) => {
                  const prevMsg = i > 0 ? group.msgs[i - 1] : null;
                  const isConsecutive = prevMsg?.senderId === msg.senderId
                    && new Date(msg.createdAt).getTime() - new Date(prevMsg!.createdAt).getTime() < 5 * 60 * 1000;

                  return isConsecutive ? (
                    /* Compact message (same sender, within 5 min) */
                    <div key={msg.id} className="group flex items-start pl-12 py-0.5 hover:bg-primary/3 rounded transition-colors">
                      <span className="text-[10px] text-primary/0 group-hover:text-primary/40 font-mono w-10 pt-0.5 shrink-0 transition-colors">
                        {formatTime(msg.createdAt)}
                      </span>
                      <p className="text-sm text-text/90 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ) : (
                    /* Full message with avatar */
                    <div key={msg.id} className="group flex items-start gap-3 mt-4 first:mt-0 hover:bg-primary/3 rounded p-1 -ml-1 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-secondary/20 overflow-hidden shrink-0 mt-0.5">
                        {msg.sender?.avatar ? (
                          <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-secondary text-sm font-bold">
                            {msg.sender?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm text-text">{msg.sender?.name || 'Unknown'}</span>
                          <span className="text-[10px] text-primary/40 font-mono">{formatTime(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text/90 leading-relaxed mt-0.5 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="px-5 pb-5 pt-2 shrink-0">
        <div className="flex items-end gap-2 bg-primary/5 border border-primary/15 rounded-xl p-2 focus-within:border-secondary/50 transition-colors">
          <textarea
            rows={1}
            value={newMessage}
            onChange={e => {
              setNewMessage(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onKeyDown={e => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                    e.preventDefault(); 
                    handleSend(); 
                    // Reset height
                    (e.target as HTMLTextAreaElement).style.height = 'auto';
                } 
            }}
            placeholder={`Message #${channelName || 'channel'}...`}
            className="flex-1 bg-transparent text-sm text-text px-2 py-2 focus:outline-none placeholder:text-primary/30 resize-none max-h-32 min-h-[40px]"
          />
          <button
            onClick={() => {
                handleSend();
                const textarea = document.querySelector('textarea');
                if (textarea) textarea.style.height = 'auto';
            }}
            disabled={!newMessage.trim()}
            className="p-2 mb-1 rounded-lg bg-secondary hover:bg-secondary/80 text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-primary/30 mt-1.5 text-center font-mono">
          PRESS ENTER TO SEND • SHIFT+ENTER FOR NEW LINE
        </p>
      </div>
    </div>
  );
}
