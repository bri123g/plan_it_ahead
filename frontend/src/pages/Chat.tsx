import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';

interface Conversation {
  conversation_id: number;
  other_user?: {
    user_id: number;
    name: string;
    email?: string;
  };
  last_message?: {
    content: string;
    created_at?: string;
  };
}

interface Message {
  message_id: number;
  sender_id: number;
  content: string;
  created_at?: string;
}

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const selectedConversation = useMemo(() => {
    return id ? parseInt(id) : null;
  }, [id]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return;
    
    try {
      const response = await api.get(`/chat/conversations/${selectedConversation}/messages`);
      const newMessages: Message[] = response.data.messages || [];
      
      // Update messages, avoiding duplicates and maintaining order
      setMessages(prev => {
        const existingIds = new Set(prev.map((m: Message) => m.message_id));
        const uniqueNewMessages = newMessages.filter((m: Message) => !existingIds.has(m.message_id));
        
        if (uniqueNewMessages.length === 0 && prev.length === newMessages.length) {
          return prev; // No changes, avoid re-render
        }
        
        return newMessages; // Use server order which is sorted by created_at ASC
      });
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  }, [selectedConversation]);

  useEffect(() => {
    let cancelled = false;
    
    const loadConversations = async () => {
      try {
        const response = await api.get('/chat/conversations');
        if (!cancelled) {
          setConversations(response.data.conversations || []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load conversations:', err);
        }
      }
    };
    
    loadConversations();
    
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      setTimeout(() => {
        loadMessages();
      }, 0);
      const interval = setInterval(() => {
        loadMessages();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    try {
      const response = await api.post(`/chat/conversations/${selectedConversation}/messages`, {
        content: message
      });
      setMessage('');
      
      // Immediately add the new message in proper order
      if (response.data.message) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(m => m.message_id === response.data.message.message_id);
          if (exists) return prev;
          
          // Add new message at the end (messages are ordered by created_at ASC)
          return [...prev, response.data.message];
        });
        setTimeout(scrollToBottom, 100);
      } else {
        loadMessages();
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const currentConversation = conversations.find(c => c.conversation_id === selectedConversation);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 py-8 px-4">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-600">Chat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        <div className="border rounded-lg p-4 overflow-y-auto bg-blue-50/50 shadow-sm">
          <h2 className="font-semibold mb-4 text-blue-600">Conversations</h2>
          <div className="space-y-3">
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => navigate(`/chat/${conv.conversation_id}`)}
                className={`p-3 rounded cursor-pointer transition-all border ${
                  selectedConversation === conv.conversation_id
                    ? 'bg-blue-50 border-blue-400'
                    : 'border-gray-200 hover:border-blue-600 hover:shadow-md'
                }`}
              >
                <h3 className={`font-medium transition-colors ${
                  selectedConversation === conv.conversation_id
                    ? 'text-blue-600'
                    : 'hover:text-blue-600'
                }`}>{conv.other_user?.name || 'Unknown'}</h3>
                {conv.last_message && (
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border rounded-lg flex flex-col bg-blue-50/50 shadow-sm">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b bg-blue-50">
                <h2 className="font-semibold text-blue-600">
                  {currentConversation?.other_user?.name || 'Chat'}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => (
                  <div
                    key={msg.message_id}
                    className={`flex ${
                      msg.sender_id === currentConversation?.other_user?.user_id
                        ? 'justify-start'
                        : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-xs p-3 rounded-lg ${
                        msg.sender_id === currentConversation?.other_user?.user_id
                          ? 'bg-gray-100'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p>{msg.content}</p>
                      {msg.created_at && (
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t flex gap-2 bg-gray-50">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button onClick={sendMessage} className="bg-blue-600 hover:bg-blue-700 text-white">Send</Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a conversation to start chatting
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

