import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';

export function Chat() {
  const { id } = useParams<{ id: string }>();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(id ? parseInt(id) : null);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      // Poll for new messages every 3 seconds
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      setConversations(response.data.conversations || []);
      if (!selectedConversation && response.data.conversations?.length > 0) {
        setSelectedConversation(response.data.conversations[0].conversation_id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    
    try {
      const response = await api.get(`/chat/conversations/${selectedConversation}/messages`);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !selectedConversation) return;

    try {
      await api.post(`/chat/conversations/${selectedConversation}/messages`, {
        content: message
      });
      setMessage('');
      loadMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const currentConversation = conversations.find(c => c.conversation_id === selectedConversation);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        <div className="border rounded-lg p-4 overflow-y-auto">
          <h2 className="font-semibold mb-4">Conversations</h2>
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.conversation_id}
                onClick={() => setSelectedConversation(conv.conversation_id)}
                className={`p-3 rounded cursor-pointer ${
                  selectedConversation === conv.conversation_id
                    ? 'bg-blue-50 border border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <h3 className="font-medium">{conv.other_user?.name || 'Unknown'}</h3>
                {conv.last_message && (
                  <p className="text-sm text-gray-600 truncate">
                    {conv.last_message.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 border rounded-lg flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-semibold">
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
                          : 'bg-blue-500 text-white'
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

              <div className="p-4 border-t flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button onClick={sendMessage}>Send</Button>
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
  );
}

