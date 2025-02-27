"use client";

import { useState } from "react";

export default function Chat({ onNewMessage }: { onNewMessage: (message: { user: string; message: string; timestamp: Date }) => void }) {
  const [chatMessages, setChatMessages] = useState<{ user: string; message: string; timestamp: Date }[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState("User1"); // Simulated user for now

  // Handle chat message submission
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      const newMsg = {
        user: currentUser,
        message: newMessage,
        timestamp: new Date(),
      };
      setChatMessages([...chatMessages, newMsg]);
      setNewMessage("");
      onNewMessage(newMsg); // Notify parent component of new message

      // Simulate real-time update (e.g., another user responding after a delay)
      setTimeout(() => {
        const response = { user: "User2", message: "Thanks for your message!", timestamp: new Date() };
        setChatMessages((prev) => [...prev, response]);
        onNewMessage(response); // Notify parent of simulated response
      }, 2000);
    }
  };

  return (
    <div className="w-3/10 p-4 bg-[#333333] rounded-lg border border-white shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-white">Chat</h2>
      <div className="flex-1 overflow-y-auto mb-4 p-2 border border-gray-600 rounded bg-gray-700">
        {chatMessages.map((msg, index) => (
          <p key={index} className="mb-2 text-gray-200">
            <strong className="text-white">{msg.user}</strong> ({msg.timestamp.toLocaleTimeString()}): {msg.message}
          </p>
        ))}
      </div>
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 p-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500 text-white font-medium transition-colors duration-200"
        >
          Send
        </button>
      </form>
      <div className="mt-4">
        <label className="mr-2 text-gray-300">User:</label>
        <select
          value={currentUser}
          onChange={(e) => setCurrentUser(e.target.value)}
          className="p-2 bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-white"
        >
          <option value="User1">User1</option>
          <option value="User2">User2</option>
        </select>
      </div>
    </div>
  );
}