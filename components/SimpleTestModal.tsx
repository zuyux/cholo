import React from "react";

export default function SimpleTestModal({ onClose }: { onClose?: () => void }) {
  console.log('SimpleTestModal rendered');
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-card text-card-foreground p-8 rounded-lg border border-border">
        <h2>¡El modal de prueba funciona!</h2>
        <button 
          onClick={() => {
            console.log('Close button clicked');
            if (onClose) onClose();
          }}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Close
        </button>
      </div>
    </div>
  );
}
