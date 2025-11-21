import React, { useState, useRef, useEffect } from 'react';
import { TextBubble, BubbleType } from '../types';
import { BubbleComponent } from './BubbleComponent';
import { Download, Type } from './Icons';

interface EditorProps {
  imageUrl: string;
}

export const Editor: React.FC<EditorProps> = ({ imageUrl }) => {
  const [bubbles, setBubbles] = useState<TextBubble[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track Drag and Resize State
  const dragRef = useRef<{
    mode: 'IDLE' | 'MOVE' | 'RESIZE';
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
  }>({ 
    mode: 'IDLE', 
    startX: 0, 
    startY: 0, 
    initialX: 0, 
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0
  });

  // Add a new bubble
  const addBubble = (type: BubbleType) => {
    let defaultWidth = 150;
    let defaultHeight = 100;
    let defaultText = "Enter text...";
    let defaultFontSize = 16;
    let defaultFontWeight = 'normal';

    if (type === BubbleType.BOX) {
      defaultWidth = 200;
      defaultHeight = 80;
    } else if (type === BubbleType.PLAIN_TEXT) {
      defaultWidth = 180;
      defaultHeight = 60;
      defaultText = "Plain Text";
      defaultFontSize = 20;
      defaultFontWeight = 'bold';
    } else if (type === BubbleType.SHOUT) {
      defaultFontWeight = 'bold';
    }

    const newBubble: TextBubble = {
      id: Date.now().toString(),
      x: 50, // Default position relative to container
      y: 50,
      text: defaultText,
      type,
      width: defaultWidth,
      height: defaultHeight,
      fontSize: defaultFontSize,
      fontWeight: defaultFontWeight
    };
    setBubbles([...bubbles, newBubble]);
    setSelectedBubbleId(newBubble.id);
  };

  const updateBubble = (id: string, updates: Partial<TextBubble>) => {
    setBubbles(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const deleteBubble = (id: string) => {
    setBubbles(prev => prev.filter(b => b.id !== id));
    if (selectedBubbleId === id) setSelectedBubbleId(null);
  };

  // Global mouse move for dragging and resizing
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const { mode, startX, startY, initialX, initialY, initialWidth, initialHeight } = dragRef.current;

      if (mode === 'IDLE' || !selectedBubbleId) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (mode === 'MOVE') {
        updateBubble(selectedBubbleId, { 
          x: initialX + deltaX, 
          y: initialY + deltaY 
        });
      } else if (mode === 'RESIZE') {
        // Enforce minimum size
        const newWidth = Math.max(60, initialWidth + deltaX);
        const newHeight = Math.max(40, initialHeight + deltaY);
        
        updateBubble(selectedBubbleId, { 
          width: newWidth, 
          height: newHeight 
        });
      }
    };

    const handleGlobalMouseUp = () => {
      dragRef.current.mode = 'IDLE';
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [selectedBubbleId, bubbles]);

  const startDrag = (e: React.MouseEvent, id: string) => {
    const bubble = bubbles.find(b => b.id === id);
    if (!bubble) return;

    // Check if we clicked on an input or button (handled in child)
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return;
    }

    dragRef.current = {
      mode: 'MOVE',
      startX: e.clientX,
      startY: e.clientY,
      initialX: bubble.x,
      initialY: bubble.y,
      initialWidth: bubble.width,
      initialHeight: bubble.height
    };
  };

  const startResize = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent drag start
    const bubble = bubbles.find(b => b.id === id);
    if (!bubble) return;

    dragRef.current = {
      mode: 'RESIZE',
      startX: e.clientX,
      startY: e.clientY,
      initialX: bubble.x,
      initialY: bubble.y,
      initialWidth: bubble.width,
      initialHeight: bubble.height
    };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex gap-3 overflow-x-auto pb-2 md:pb-0">
          <button 
            onClick={() => addBubble(BubbleType.SPEECH)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Speech
          </button>
          <button 
            onClick={() => addBubble(BubbleType.THOUGHT)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Thought
          </button>
          <button 
            onClick={() => addBubble(BubbleType.SHOUT)}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Shout
          </button>
           <button 
            onClick={() => addBubble(BubbleType.BOX)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors whitespace-nowrap"
          >
            Box
          </button>
          <button 
            onClick={() => addBubble(BubbleType.PLAIN_TEXT)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-900 hover:bg-white rounded-md text-sm font-bold transition-colors whitespace-nowrap"
          >
            <Type size={16} /> Text
          </button>
        </div>

        <div className="flex gap-3 pl-4">
             <button 
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium whitespace-nowrap"
                onClick={() => alert("To save: Please take a screenshot of this page! \n(Browser security limits direct canvas downloading for now)")}
            >
                <Download size={16} /> Save
            </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 overflow-auto p-8 bg-gray-900 flex justify-center relative">
        <div 
          ref={containerRef}
          className="relative shadow-2xl bg-white select-none"
          style={{ 
            width: 'fit-content',
            height: 'fit-content',
          }}
          onMouseDown={() => setSelectedBubbleId(null)} // Deselect when clicking bg
        >
          {/* Generated Image Layer */}
          <img 
            src={imageUrl} 
            alt="Generated Manga" 
            className="max-w-full h-auto block pointer-events-none"
            style={{ maxHeight: '85vh' }}
            draggable={false}
          />

          {/* Overlay Bubbles */}
          {bubbles.map(bubble => (
            <div key={bubble.id}>
              <BubbleComponent
                bubble={bubble}
                isSelected={selectedBubbleId === bubble.id}
                onSelect={setSelectedBubbleId}
                onUpdate={updateBubble}
                onDelete={deleteBubble}
                onDragStart={startDrag}
                onResizeStart={startResize}
                scale={canvasScale}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};