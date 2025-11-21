import React, { useState, useRef } from 'react';
import { TextBubble, BubbleType } from '../types';
import { Trash2, Move, ArrowRightLeft, ArrowUpDown, Maximize, Palette, PaintBucket, Highlighter } from './Icons';

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

// Font options mapping
const FONT_OPTIONS = [
  { name: 'Sriracha (TH)', value: 'Sriracha' },
  { name: 'Chakra (TH)', value: 'Chakra Petch' },
  { name: 'Itim (TH)', value: 'Itim' },
  { name: 'Mali (TH)', value: 'Mali' },
  { name: 'Bangers (EN)', value: 'Bangers' },
];

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
  const fontFamily = bubble.fontFamily || 'Sriracha';
  const padding = bubble.padding !== undefined ? bubble.padding : 16;
  const lineHeight = bubble.lineHeight || 1.2;
  const letterSpacing = bubble.letterSpacing || 0;

  // Visual Styles
  const textColor = bubble.textColor || '#000000';
  const backgroundColor = bubble.backgroundColor || '#ffffff';
  const borderColor = bubble.borderColor || '#000000';
  const strokeWidth = bubble.textStrokeWidth || 0;
  const strokeColor = bubble.textStrokeColor || '#ffffff';

  // 1. Container Style (Positioning & Interaction)
  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${bubble.x}px`,
    top: `${bubble.y}px`,
    width: `${bubble.width}px`,
    height: `${bubble.height}px`,
    zIndex: isSelected ? 50 : 10,
    cursor: isSelected ? 'move' : 'pointer',
  };

  // 2. Shape Style (Visuals: Background, Border, ClipPath)
  const getShapeStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      width: '100%',
      height: '100%',
      backgroundColor: backgroundColor,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'box-shadow 0.2s',
      boxSizing: 'border-box',
    };

    switch (bubble.type) {
      case BubbleType.THOUGHT:
        return {
          ...base,
          border: `2px dashed ${borderColor}`,
          borderRadius: '50%',
        };
      case BubbleType.WHISPER:
        return {
          ...base,
           border: `2px dashed ${borderColor}`,
           borderRadius: '2rem',
        };
      case BubbleType.SHOUT:
        return {
          ...base,
          border: `4px solid ${borderColor}`,
          transform: 'rotate(-1deg)',
        };
      case BubbleType.FLASH:
         // Jagged / Explosion shape with Clip Path
        return {
           ...base,
           // Borders are tricky with clip-path, using filter drop-shadow to simulate border
           clipPath: 'polygon(0% 15%, 10% 10%, 15% 0%, 25% 10%, 35% 5%, 40% 15%, 50% 5%, 60% 15%, 70% 5%, 80% 15%, 90% 5%, 95% 20%, 100% 30%, 90% 40%, 100% 50%, 90% 60%, 100% 75%, 85% 80%, 90% 90%, 75% 95%, 60% 90%, 50% 100%, 40% 90%, 30% 95%, 20% 90%, 10% 100%, 5% 85%, 0% 75%, 10% 60%, 0% 50%, 10% 40%, 0% 25%)',
           filter: `drop-shadow(0 0 2px ${borderColor}) drop-shadow(0 0 1px ${borderColor})`,
           backgroundColor: backgroundColor,
           border: 'none', // Border handled by filter/shadow
        };
      case BubbleType.BOX:
        return {
          ...base,
          border: `2px solid ${borderColor}`,
          borderRadius: '0',
          boxShadow: '4px 4px 0px rgba(0,0,0,0.2)',
        };
      case BubbleType.PLAIN_TEXT:
        return {
          ...base,
          backgroundColor: 'transparent',
          border: 'none',
          boxShadow: 'none',
        };
      case BubbleType.SPEECH:
      default:
        return {
          ...base,
          border: `2px solid ${borderColor}`,
          borderRadius: '2rem',
          borderBottomLeftRadius: '0',
        };
    }
  };

  const getTextStyle = () => ({
    fontSize: `${fontSize}px`, 
    fontWeight: fontWeight,
    fontFamily: fontFamily,
    lineHeight: lineHeight,
    letterSpacing: `${letterSpacing}px`,
    color: textColor,
    textAlign: 'center' as const,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    // WebkitTextStroke for outlining text
    WebkitTextStroke: strokeWidth > 0 ? `${strokeWidth}px ${strokeColor}` : 'unset',
    textShadow: strokeWidth > 0 ? 'none' : (bubble.type === BubbleType.PLAIN_TEXT ? '0 2px 2px rgba(0,0,0,0.5)' : 'none'),
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    outline: 'none',
    resize: 'none' as const,
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: `${padding}px`, // Padding applied to text container area
  });

  const handleFontSizeChange = (delta: number) => {
    const newSize = Math.max(8, Math.min(96, fontSize + delta));
    onUpdate(bubble.id, { fontSize: newSize });
  };

  const handlePaddingChange = (delta: number) => {
    const newPad = Math.max(0, padding + delta);
    onUpdate(bubble.id, { padding: newPad });
  };

  const handleLineHeightChange = (delta: number) => {
    const newHeight = Math.max(0.8, Math.min(3.0, lineHeight + delta));
    onUpdate(bubble.id, { lineHeight: Math.round(newHeight * 10) / 10 });
  };

  const handleLetterSpacingChange = (delta: number) => {
    const newSpacing = Math.max(-2, Math.min(20, letterSpacing + delta));
    onUpdate(bubble.id, { letterSpacing: newSpacing });
  };

  const toggleBold = () => {
    const newWeight = fontWeight === 'bold' ? 'normal' : 'bold';
    onUpdate(bubble.id, { fontWeight: newWeight });
  };

  const cycleFont = () => {
    const currentIndex = FONT_OPTIONS.findIndex(f => f.value === fontFamily);
    const nextIndex = (currentIndex + 1) % FONT_OPTIONS.length;
    onUpdate(bubble.id, { fontFamily: FONT_OPTIONS[nextIndex].value });
  };

  const toggleStroke = () => {
    if (strokeWidth > 0) {
      onUpdate(bubble.id, { textStrokeWidth: 0 });
    } else {
      onUpdate(bubble.id, { textStrokeWidth: 3, textStrokeColor: '#ffffff' });
    }
  };

  const currentFontName = FONT_OPTIONS.find(f => f.value === fontFamily)?.name || 'Font';

  return (
    <div
      ref={bubbleRef}
      style={containerStyle}
      className={`group ${isSelected ? 'ring-2 ring-indigo-500 shadow-2xl' : ''}`}
      onMouseDown={(e) => {
        e.stopPropagation(); // Prevent clicking the canvas behind
        onSelect(bubble.id);
        onDragStart(e, bubble.id);
      }}
    >
      {/* Controls Overlay (Independent of Shape) */}
      {isSelected && !isEditing && (
        <>
          {/* Toolbar */}
          <div className="absolute -top-36 left-1/2 transform -translate-x-1/2 flex flex-col gap-1 z-[60]">
             {/* (Keep toolbar content exactly as before) */}
             {/* Row 1: Font Basics */}
            <div className="flex items-center gap-1 bg-gray-800 text-white p-1 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
              <button className="w-6 h-6 hover:bg-gray-700 rounded" onClick={(e) => { e.stopPropagation(); handleFontSizeChange(-2); }}>-</button>
              <span className="text-xs min-w-[1.5rem] text-center select-none">{fontSize}</span>
              <button className="w-6 h-6 hover:bg-gray-700 rounded" onClick={(e) => { e.stopPropagation(); handleFontSizeChange(2); }}>+</button>
              <div className="w-px h-4 bg-gray-600 mx-1"></div>
              <button className={`w-6 h-6 hover:bg-gray-700 rounded ${fontWeight === 'bold' ? 'bg-indigo-600' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBold(); }}><span className="font-bold text-xs">B</span></button>
              <div className="w-px h-4 bg-gray-600 mx-1"></div>
              <button className="h-6 px-2 hover:bg-gray-700 rounded text-[10px] uppercase bg-gray-900 border border-gray-600 truncate max-w-[80px]" onClick={(e) => { e.stopPropagation(); cycleFont(); }}>{currentFontName.split(' ')[0]}</button>
            </div>

            {/* Row 2: Colors */}
            <div className="flex items-center gap-2 bg-gray-800 text-white p-1 rounded-lg shadow-xl whitespace-nowrap border border-gray-700 justify-center">
               <div className="relative group/picker flex items-center justify-center" title="Text Color">
                  <Palette size={12} className="absolute pointer-events-none text-white drop-shadow-md" />
                  <input type="color" value={textColor} onChange={(e) => onUpdate(bubble.id, { textColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent overflow-hidden appearance-none" />
               </div>
               <button onClick={(e) => { e.stopPropagation(); toggleStroke(); }} className={`w-6 h-6 flex items-center justify-center hover:bg-gray-700 rounded ${strokeWidth > 0 ? 'bg-indigo-600' : ''}`} title="Toggle Text Outline"><Highlighter size={12} /></button>
               {strokeWidth > 0 && (
                  <div className="relative group/picker flex items-center justify-center" title="Outline Color">
                    <div className="w-4 h-4 border border-white rounded-full absolute pointer-events-none"></div>
                    <input type="color" value={strokeColor} onChange={(e) => onUpdate(bubble.id, { textStrokeColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent overflow-hidden appearance-none" />
                  </div>
               )}
               <div className="w-px h-4 bg-gray-600 mx-1"></div>
               <div className="relative group/picker flex items-center justify-center" title="Fill Color">
                  <PaintBucket size={12} className="absolute pointer-events-none text-black mix-blend-difference" />
                  <input type="color" value={backgroundColor} onChange={(e) => onUpdate(bubble.id, { backgroundColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent overflow-hidden appearance-none" />
               </div>
               <div className="relative group/picker flex items-center justify-center" title="Border Color">
                   <div className="absolute w-4 h-4 border-2 border-gray-400 rounded-sm pointer-events-none"></div>
                   <input type="color" value={borderColor} onChange={(e) => onUpdate(bubble.id, { borderColor: e.target.value })} className="w-6 h-6 rounded cursor-pointer border-none p-0 bg-transparent overflow-hidden appearance-none" />
               </div>
            </div>

            {/* Row 3: Spacing */}
            <div className="flex items-center justify-between gap-2 bg-gray-800 text-white p-1 rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
               <div className="flex items-center gap-1"><ArrowUpDown size={10} className="text-gray-400" /><button onClick={(e) => { e.stopPropagation(); handleLineHeightChange(-0.1); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">-</button><button onClick={(e) => { e.stopPropagation(); handleLineHeightChange(0.1); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">+</button></div>
               <div className="w-px h-3 bg-gray-600"></div>
               <div className="flex items-center gap-1"><ArrowRightLeft size={10} className="text-gray-400" /><button onClick={(e) => { e.stopPropagation(); handleLetterSpacingChange(-1); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">-</button><button onClick={(e) => { e.stopPropagation(); handleLetterSpacingChange(1); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">+</button></div>
               <div className="w-px h-3 bg-gray-600"></div>
               <div className="flex items-center gap-1"><Maximize size={10} className="text-gray-400" /><button onClick={(e) => { e.stopPropagation(); handlePaddingChange(-2); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">-</button><button onClick={(e) => { e.stopPropagation(); handlePaddingChange(2); }} className="hover:bg-gray-700 w-4 h-4 flex items-center justify-center rounded text-[10px]">+</button></div>
            </div>
          </div>

          {/* Delete Button - Now positioned on wrapper, NEVER clipped */}
          <button
            className="absolute -top-4 -right-4 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-md z-50 cursor-pointer flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(bubble.id);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            title="Delete Bubble"
          >
            <Trash2 size={16} />
          </button>
          
          {/* Edit Toggle */}
          <button
             className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-3 py-1 text-xs rounded-full hover:bg-indigo-700 shadow-md z-50 cursor-pointer whitespace-nowrap flex items-center gap-1"
             onClick={(e) => {
               e.stopPropagation();
               setIsEditing(true);
             }}
             onMouseDown={(e) => e.stopPropagation()}
          >
            Edit
          </button>

          {/* Resize Handle */}
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-50 flex items-end justify-end p-1"
            onMouseDown={(e) => onResizeStart(e, bubble.id)}
          >
             <div className="w-3 h-3 bg-indigo-500 rounded-sm border border-white shadow-sm"></div>
          </div>

          {/* Drag Cue */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-20 pointer-events-none">
            <Move size={24} />
          </div>
        </>
      )}

      {/* Visual Content Layer (Affected by Clip Path / Rotation) */}
      <div style={getShapeStyle()}>
         {isEditing ? (
            <textarea
              autoFocus
              className="p-0 m-0 block"
              value={bubble.text}
              onChange={(e) => onUpdate(bubble.id, { text: e.target.value })}
              onBlur={() => setIsEditing(false)}
              style={getTextStyle()}
              onMouseDown={(e) => e.stopPropagation()} 
            />
          ) : (
            <div 
              className="p-0 m-0"
              style={getTextStyle()}
            >
              {bubble.text || "..."}
            </div>
          )}
      </div>
    </div>
  );
};