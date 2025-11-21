import React, { useState, useRef } from 'react';
import { TextBubble, BubbleType } from '../types';
import { Trash2, Move } from './Icons';

interface BubbleProps {
  bubble: TextBubble;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<TextBubble>) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.MouseEvent, id: string) => void;
  onResizeStart: (e: React.MouseEvent, id: string) => void;
  scale: number;
}

export const BubbleComponent: React.FC<BubbleProps> = ({
  bubble,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onResizeStart,
  scale
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const fontSize = bubble.fontSize || 16;
  const fontWeight = bubble.fontWeight || 'normal';

  // Styling based on bubble type
  const getBubbleStyle = () => {
    const base = "absolute flex items-center justify-center p-4 text-black text-center font-comic leading-tight break-words select-none shadow-lg transition-all";
    
    switch (bubble.type) {
      case BubbleType.THOUGHT:
        return `${base} bg-white rounded-[50%] border-2 border-gray-800 border-dashed`;
      case BubbleType.SHOUT:
        return `${base} bg-yellow-100 border-4 border-black transform rotate-1`;
      case BubbleType.BOX:
        return `${base} bg-white border-2 border-black rounded-none shadow-md`;
      case BubbleType.PLAIN_TEXT:
        // Transparent background, no border, text shadow for readability. 
        // Added hover border to make it easier to find the clickable area.
        return `${base} bg-transparent shadow-none border-none text-black drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)] hover:ring-1 hover:ring-gray-400/50 rounded`;
      case BubbleType.SPEECH:
      default:
        return `${base} bg-white border-2 border-black rounded-[2rem] rounded-bl-none`;
    }
  };

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(8, Math.min(72, fontSize + delta));
    onUpdate(bubble.id, { fontSize: newSize });
  };

  const toggleBold = () => {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
    onUpdate(bubble.id, { fontWeight: newWeight });
  };

  return (
    <div
      ref={bubbleRef}
      style={{
        left: `${bubble.x}px`,
        top: `${bubble.y}px`,
        width: `${bubble.width}px`,
        height: `${bubble.height}px`,
        zIndex: isSelected ? 50 : 10,
        cursor: isSelected ? 'move' : 'pointer'
      }}
      className={`${getBubbleStyle()} group ${isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : ''}`}
      onMouseDown={(e) => {
        e.stopPropagation(); // Prevent clicking the canvas behind
        onSelect(bubble.id);
        onDragStart(e, bubble.id);
      }}
    >
      {/* Style Controls (Only visible when selected and NOT editing text directly) */}
      {isSelected && !isEditing && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-gray-800 text-white p-1 rounded-lg shadow-xl z-[60] whitespace-nowrap">
           <button 
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
              onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-2); }}
              title="Decrease Font Size"
            >
              -
            </button>
            <span className="text-xs min-w-[1.5rem] text-center">{fontSize}</span>
            <button 
              className="w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded"
              onClick={(e) => { e.stopPropagation(); handleFontSizeChange(2); }}
              title="Increase Font Size"
            >
              +
            </button>
            <div className="w-px h-4 bg-gray-600 mx-1"></div>
            <button 
              className={`w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded ${fontWeight === 'bold' ? 'bg-indigo-600 hover:bg-indigo-500' : ''}`}
              onClick={(e) => { e.stopPropagation(); toggleBold(); }}
              title="Toggle Bold"
            >
              <span className="font-bold text-xs">B</span>
            </button>
        </div>
      )}

      {/* Edit Text Area */}
      {isEditing ? (
        <textarea
          autoFocus
          className="w-full h-full bg-transparent resize-none outline-none overflow-hidden text-center p-1 font-comic"
          value={bubble.text}
          onChange={(e) => onUpdate(bubble.id, { text: e.target.value })}
          onBlur={() => setIsEditing(false)}
          style={{ 
            fontSize: `${fontSize}px`, 
            fontWeight: fontWeight,
            lineHeight: '1.2' 
          }}
          onMouseDown={(e) => e.stopPropagation()} 
        />
      ) : (
        <div 
          className="w-full h-full flex items-center justify-center pointer-events-none overflow-hidden p-1"
          style={{ 
            fontSize: `${fontSize}px`, 
            fontWeight: fontWeight,
            lineHeight: '1.2' 
          }}
        >
          {bubble.text || "..."}
        </div>
      )}

      {/* Controls (Only visible when selected) */}
      {isSelected && !isEditing && (
        <>
          {/* Delete Button */}
          <button
            className="absolute -top-3 -right-3 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow-md z-50 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bubble.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Trash2 size={14} />
          </button>
          
          {/* Edit Toggle */}
          <button
             className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 text-xs rounded-full hover:bg-indigo-700 shadow-md z-50 cursor-pointer whitespace-nowrap"
             onClick={(e) => {
               e.stopPropagation();
               setIsEditing(true);
             }}
             onMouseDown={(e) => e.stopPropagation()}
          >
            Edit Text
          </button>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-end justify-end p-1"
            onMouseDown={(e) => onResizeStart(e, bubble.id)}
          >
             <div className="w-3 h-3 bg-indigo-500 rounded-sm border border-white shadow-sm"></div>
          </div>

          {/* Drag Handle Visual Cue */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 pointer-events-none">
            <Move size={24} />
          </div>
        </>
      )}
    </div>
  );
};