import React from "react";

export default function SimpleTestModal({ onClose }: { onClose?: () => void }) {
  console.log('SimpleTestModal rendered');
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white text-black p-8 rounded-lg">
        <h2>Simple Test Modal is working!</h2>
        <button 
          onClick={() => {
            console.log('Close button clicked');
            if (onClose) onClose();
          }}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
