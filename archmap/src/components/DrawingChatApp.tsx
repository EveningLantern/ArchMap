"use client";

import Chat from "./Chat";
import DrawingBoard from "./DrawingBoard"; // Updated to point to the single file

export default function DrawingChatApp() {
  const handleNewMessage = (message: { user: string; message: string; timestamp: Date }) => {
    // This function can be used to handle messages if needed (e.g., sync with a backend)
    console.log("New message:", message);
  };

  return (
    <div className="flex min-h-screen w-screen bg-gray-900">
      {/* Left Side: Chat Interface (30% width) */}
      <Chat onNewMessage={handleNewMessage} />

      {/* Padding between chat and drawing */}
      <div className="w-2 px-4"></div> {/* Adds 2% width padding (16px with default Tailwind spacing) */}

      {/* Right Side: Drawing Board (70% width) */}
      <DrawingBoard />
    </div>
  );
}