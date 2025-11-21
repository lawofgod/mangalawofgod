import React, { useState, useRef, useEffect } from 'react';
import { TextBubble, BubbleType } from '../types';
import { BubbleComponent } from './BubbleComponent';
import { Download, Type, Loader2, MessageCircle, Zap, Cloud, Trash2 } from './Icons';
import html2canvas from 'html2canvas';

interface EditorProps {
  imageUrl: string;
}

export const Editor: React.FC<EditorProps> = ({ imageUrl }) => {
  const [bubbles, setBubbles] = useState<TextBubble[]>([]);
  const [selectedBubbleId, setSelectedBubbleId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<TextBubble | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
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
    let defaultText = "ข้อความ..."; // Thai friendly default
    let defaultFontSize = 16;
    let defaultFontWeight = 'normal';
    // Default to Sriracha as it supports Thai well and looks like handwriting
    let defaultFontFamily = 'Sriracha'; 
    let defaultPadding = 16; 
    let defaultLineHeight = 1.2;
    let defaultLetterSpacing = 0;
    
    // Default Colors
    let defaultTextColor = '#000000';
    let defaultBgColor = '#ffffff';
    let defaultBorderColor = '#000000';
    let defaultStrokeWidth = 0;
    let defaultStrokeColor = '#ffffff';

    if (type === BubbleType.BOX) {
      defaultWidth = 200;
      defaultHeight = 80;
      defaultFontFamily = 'Chakra Petch'; // Sci-fi/Boxy look
      defaultPadding = 8;
    } else if (type === BubbleType.PLAIN_TEXT) {
      defaultWidth = 180;
      defaultHeight = 60;
      defaultText = "Plain Text";
      defaultFontSize = 20;
      defaultFontWeight = 'bold';
      defaultPadding = 4;
      defaultBgColor = 'transparent';
      defaultBorderColor = 'transparent';
      // Add stroke by default for plain text to make it visible
      defaultStrokeWidth = 3; 
      defaultStrokeColor = '#ffffff';
    } else if (type === BubbleType.SHOUT) {
      defaultFontWeight = 'bold';
      defaultPadding = 24; // More padding for shapes
      defaultBgColor = '#fffacd'; // Lemon Chiffon
    } else if (type === BubbleType.WHISPER) {
      defaultFontFamily = 'Itim';
      defaultTextColor = '#555555';
      defaultBorderColor = '#888888';
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
      fontWeight: defaultFontWeight,
      fontFamily: defaultFontFamily,
      padding: defaultPadding,
      lineHeight: defaultLineHeight,
      letterSpacing: defaultLetterSpacing,
      textColor: defaultTextColor,
      backgroundColor: defaultBgColor,
      borderColor: defaultBorderColor,
      textStrokeWidth: defaultStrokeWidth,
      textStrokeColor: defaultStrokeColor
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

  // Keyboard Shortcuts: Copy, Paste, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // 1. DELETE (Delete or Backspace)
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedBubbleId && !isInput) {
        e.preventDefault(); // Prevent browser back navigation
        deleteBubble(selectedBubbleId);
      }

      // 2. COPY (Ctrl+C or Cmd+C)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && selectedBubbleId && !isInput) {
        const bubbleToCopy = bubbles.find(b => b.id === selectedBubbleId);
        if (bubbleToCopy) {
          setClipboard(bubbleToCopy);
          // Optional: console.log("Copied bubble", bubbleToCopy.id);
        }
      }

      // 3. PASTE (Ctrl+V or Cmd+V)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && clipboard && !isInput) {
        const newId = Date.now().toString();
        const newBubble = {
          ...clipboard,
          id: newId,
          // Offset the pasted bubble slightly so it doesn't overlap perfectly
          x: clipboard.x + 30,
          y: clipboard.y + 30
        };
        setBubbles(prev => [...prev, newBubble]);
        setSelectedBubbleId(newId); // Select the newly pasted bubble
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBubbleId, bubbles, clipboard]);

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
    if ((e.target as HTMLElement).tagName === 'BUTTON' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') {
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

  const handleSave = async () => {
    if (!containerRef.current) return;

    try {
      setIsSaving(true);
      // Deselect current bubble to hide resize handles/borders
      setSelectedBubbleId(null);

      // Allow React to render the deselection before capturing (small delay)
      await new Promise(resolve => setTimeout(resolve, 100));

      // CLONE STRATEGY:
      const element = containerRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      
      // Style the clone to ensure it captures exactly as is, but in a safe environment
      clone.style.position = 'fixed';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.zIndex = '-9999'; // Hide behind everything
      clone.style.margin = '0';
      clone.style.transform = 'none'; // Remove any potential transforms
      // Ensure the clone has the same dimensions
      clone.style.width = `${element.offsetWidth}px`; 
      clone.style.height = `${element.offsetHeight}px`;
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        backgroundColor: null,
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false,
        allowTaint: true,
        scrollX: 0,
        scrollY: 0,
      });

      // Cleanup
      document.body.removeChild(clone);

      const link = document.createElement('a');
      link.download = 'manga-lawofgod-page.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save image. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-50 shadow-lg">
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-thin">
          <button onClick={() => addBubble(BubbleType.SPEECH)} className="flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-xs font-medium transition-colors whitespace-nowrap">
            Speech
          </button>
          <button onClick={() => addBubble(BubbleType.THOUGHT)} className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors whitespace-nowrap">
            <Cloud size={14} /> Thought
          </button>
           <button onClick={() => addBubble(BubbleType.WHISPER)} className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors whitespace-nowrap border border-dashed border-gray-400">
            <MessageCircle size={14} /> Whisper
          </button>
          <button onClick={() => addBubble(BubbleType.SHOUT)} className="flex items-center gap-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-xs font-medium transition-colors whitespace-nowrap">
            Shout
          </button>
           <button onClick={() => addBubble(BubbleType.BOX)} className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-xs font-medium transition-colors whitespace-nowrap">
            Box
          </button>
          <button onClick={() => addBubble(BubbleType.PLAIN_TEXT)} className="flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-900 hover:bg-white rounded-md text-xs font-bold transition-colors whitespace-nowrap">
            <Type size={14} /> Text Only
          </button>
        </div>

        <div className="flex gap-3 pl-4">
             {/* Toolbar Delete Button */}
             {selectedBubbleId && (
               <button
                 className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-medium transition-colors text-white"
                 onClick={() => deleteBubble(selectedBubbleId)}
                 title="Delete Selected (Del)"
               >
                 <Trash2 size={16} />
               </button>
             )}

             <button 
                className={`flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${isSaving ? 'opacity-70 cursor-wait' : ''}`}
                onClick={handleSave}
                disabled={isSaving}
            >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {isSaving ? 'Saving...' : 'Save'}
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