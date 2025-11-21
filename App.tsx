import React, { useState, useEffect } from 'react';
import { Upload, Wand2, Loader2, ImageIcon, Zap, MessageSquare, Trash2, Square, RefreshCw, RectangleVertical, RectangleHorizontal, Copy } from './components/Icons';
import { generateMangaPage } from './services/geminiService';
import { Editor } from './components/Editor';

const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for generation results
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [storyPrompt, setStoryPrompt] = useState<string>("");
  
  // State for style selection (Color vs B&W)
  const [isColor, setIsColor] = useState<boolean>(true);
  
  // State for Model Quality (Standard vs Pro)
  const [useProModel, setUseProModel] = useState<boolean>(false);

  // State for Panel Count
  const [panelCount, setPanelCount] = useState<string>("random");

  // State for Aspect Ratio
  const [aspectRatio, setAspectRatio] = useState<'portrait' | 'landscape'>('portrait');

  // State for Variation Count
  const [variationCount, setVariationCount] = useState<number>(3);

  // State for API Key Verification
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio && await (window as any).aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true); // Assume success per race condition instructions
      setError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Convert FileList to Array
      const newFiles = Array.from(e.target.files) as File[];
      
      // Append to existing files or replace? Let's append to allow building a set
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);

      // Create previews for new files
      const newUrls = newFiles.map(f => URL.createObjectURL(f));
      setPreviewUrls([...previewUrls, ...newUrls]);
      
      setError(null);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);

    // Revoke old URL to free memory
    URL.revokeObjectURL(previewUrls[index]);
    
    const newUrls = [...previewUrls];
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  const handleGenerate = async () => {
    if (files.length === 0) return;
    
    // If user wants Pro model but hasn't selected a key, force selection
    if (useProModel && !hasApiKey) {
      const confirmed = window.confirm("Pro Quality requires a specific API Key with billing enabled. Do you want to select one now?");
      if (confirmed) {
        await handleSelectKey();
        // We can't proceed automatically because we need to wait for the key to be set in the env
        return; 
      } else {
        // Switch back to standard if they decline
        setUseProModel(false);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImages([]); // Clear previous results

    try {
      // Request variations based on user selection
      const resultImages = await generateMangaPage(
        files, 
        storyPrompt, 
        isColor, 
        useProModel, 
        panelCount, 
        variationCount, 
        aspectRatio
      );
      setGeneratedImages(resultImages);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || "";
      
      // Handle 403/Permission errors
      if (
        errorMessage.includes("403") || 
        errorMessage.includes("PERMISSION_DENIED") || 
        errorMessage.includes("The caller does not have permission")
      ) {
        setHasApiKey(false);
        setError("Permission denied. The selected model requires a valid API Key with billing enabled. Please try Standard mode or select a key.");
      } 
      // Handle 429/Quota errors
      else if (
        errorMessage.includes("429") || 
        errorMessage.includes("quota") || 
        errorMessage.includes("RESOURCE_EXHAUSTED")
      ) {
        setError("Server is busy (API Quota Exceeded). Please wait a minute before trying again.");
      } 
      else {
        setError(errorMessage || "Failed to generate manga page. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGeneratedImages([]);
    setSelectedImage(null);
    setFiles([]);
    setPreviewUrls([]);
    setError(null);
    // Keep settings (prompt, mode) for easier retry
  };

  const handleBackToSelection = () => {
    setSelectedImage(null);
  };

  // Render Editor View
  if (selectedImage) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 text-white">
         <div className="bg-indigo-900 text-white px-6 py-2 text-xs flex justify-between items-center">
            <div className="flex items-center gap-4">
               <span className="font-comic text-lg">Manga lawofgod</span>
               {generatedImages.length > 1 && (
                 <button onClick={handleBackToSelection} className="text-indigo-300 hover:text-white flex items-center gap-1">
                    &larr; Back to Variations
                 </button>
               )}
            </div>
            <button onClick={handleReset} className="hover:text-indigo-200 underline">Start Over</button>
         </div>
        <Editor imageUrl={selectedImage} />
      </div>
    );
  }

  // Render Selection View
  if (generatedImages.length > 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6">
        <h2 className="text-3xl font-comic mb-8 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          Choose your favorite variation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
          {generatedImages.map((img, idx) => (
            <div 
              key={idx}
              className="group relative bg-gray-800 rounded-xl p-2 cursor-pointer hover:scale-105 transition-transform duration-300 border-2 border-transparent hover:border-indigo-500 shadow-2xl"
              onClick={() => setSelectedImage(img)}
            >
              <img 
                src={img} 
                alt={`Variation ${idx + 1}`} 
                className="w-full h-auto rounded-lg shadow-md"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                 <span className="opacity-0 group-hover:opacity-100 bg-indigo-600 text-white px-6 py-2 rounded-full font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all">
                   Select This One
                 </span>
              </div>
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-xs font-bold">
                #{idx + 1}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex gap-4">
           <button 
             onClick={() => setGeneratedImages([])}
             className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-gray-300 transition-colors flex items-center gap-2"
           >
             <Trash2 size={18} /> Discard & Back
           </button>
           <button 
             onClick={handleGenerate}
             className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-white transition-colors shadow-lg flex items-center gap-2"
           >
             <RefreshCw size={18} /> Re-generate ({variationCount}x)
           </button>
        </div>
      </div>
    );
  }

  // Render Upload/Start View
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
        
        {/* Left Column: Text */}
        <div className="space-y-6">
          <h1 className="text-6xl font-comic text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 leading-tight">
            Manga lawofgod
          </h1>
          <p className="text-xl text-gray-400 font-light">
            Turn your photos into multi-panel manga pages. Add dialogue, customize layout, and tell your story.
          </p>
          
          <div className="space-y-4 pt-4">
            <div className="flex items-center gap-4">
              <div className="bg-indigo-500/20 p-3 rounded-full text-indigo-400">
                <ImageIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Smart Reference</h3>
                <p className="text-sm text-gray-400">Supports multiple characters (upload 1+ images).</p>
              </div>
            </div>
             <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 p-3 rounded-full text-purple-400">
                <Wand2 size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Auto-Layout</h3>
                <p className="text-sm text-gray-400">Generates variations to choose from.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Upload Card */}
        <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700 relative overflow-hidden">
          
          <h2 className="text-2xl font-bold mb-6 z-10 relative">Create your page</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-6 relative z-10">
            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-600 rounded-xl p-4 text-center hover:border-indigo-500 transition-colors bg-gray-900/50">
              {previewUrls.length > 0 ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative group aspect-square">
                        <img 
                          src={url} 
                          alt={`Preview ${idx}`} 
                          className="w-full h-full object-cover rounded-lg shadow-sm" 
                        />
                        <button
                          onClick={() => removeFile(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {/* Add More Button */}
                    <label className="cursor-pointer flex items-center justify-center bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg transition-colors aspect-square">
                      <div className="flex flex-col items-center gap-1">
                        <Upload size={16} className="text-gray-400" />
                        <span className="text-[10px] text-gray-400">Add</span>
                      </div>
                      <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">{files.length} image{files.length !== 1 ? 's' : ''} selected</p>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-3 py-6">
                  <Upload size={24} className="text-gray-400" />
                  <span className="text-gray-300 font-medium text-sm">Upload Character Refs</span>
                  <span className="text-xs text-gray-500">(Select multiple for multiple chars)</span>
                  <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                </label>
              )}
            </div>

            {/* Story Prompt Input */}
            <div className="space-y-2">
               <label className="text-sm font-medium text-gray-400 flex items-center gap-2">
                 <MessageSquare size={14} /> Story Details (Optional)
               </label>
               <textarea
                 value={storyPrompt}
                 onChange={(e) => setStoryPrompt(e.target.value)}
                 placeholder="e.g. The red-haired hero and the robot are drinking coffee in a futuristic cafe..."
                 className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
               />
            </div>

            {/* Options Grid */}
            <div className="space-y-4">
              
              {/* Row 1: Style & Quality */}
              <div className="grid grid-cols-2 gap-4">
                {/* Style Selector */}
                <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-700">
                   <button 
                    onClick={() => setIsColor(true)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      isColor 
                        ? 'bg-gray-700 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 via-green-500 to-blue-500"></div>
                    Color
                  </button>
                  <button 
                    onClick={() => setIsColor(false)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      !isColor 
                        ? 'bg-gray-700 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    B&W
                  </button>
                </div>

                {/* Quality Selector */}
                <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-700">
                   <button 
                    onClick={() => setUseProModel(false)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      !useProModel 
                        ? 'bg-gray-700 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Standard
                  </button>
                  <button 
                    onClick={() => setUseProModel(true)}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      useProModel 
                        ? 'bg-gray-700 text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    Pro <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                  </button>
                </div>
              </div>

              {/* Row 2: Orientation (Aspect Ratio) & Variation Count */}
              <div className="grid grid-cols-2 gap-4">
                 {/* Orientation */}
                 <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <ImageIcon size={12} /> Orientation
                    </label>
                    <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-700">
                      <button 
                        onClick={() => setAspectRatio('portrait')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          aspectRatio === 'portrait'
                            ? 'bg-gray-700 text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <RectangleVertical size={14} /> Vert
                      </button>
                      <button 
                        onClick={() => setAspectRatio('landscape')}
                        className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          aspectRatio === 'landscape'
                            ? 'bg-gray-700 text-white shadow-sm' 
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <RectangleHorizontal size={14} /> Horz
                      </button>
                    </div>
                 </div>

                 {/* Variation Count */}
                 <div>
                    <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                      <Copy size={12} /> Variations
                    </label>
                    <div className="flex gap-1 p-1 bg-gray-900 rounded-lg border border-gray-700">
                      {[1, 2, 3].map(count => (
                        <button 
                          key={count}
                          onClick={() => setVariationCount(count)}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            variationCount === count
                              ? 'bg-gray-700 text-white shadow-sm' 
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          {count}x
                        </button>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Row 3: Panel Count */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-2">
                  <Square size={12} /> Panel Layout
                </label>
                <div className="flex gap-2">
                   {['random', '1', '2', '3', '4'].map(opt => (
                     <button
                        key={opt}
                        onClick={() => setPanelCount(opt)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                          panelCount === opt
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                            : 'bg-gray-700/30 border-transparent text-gray-400 hover:bg-gray-700/50'
                        }`}
                     >
                       {opt === 'random' ? 'Random' : opt}
                     </button>
                   ))}
                </div>
              </div>

            </div>

            {/* Action Button */}
            <button
              onClick={handleGenerate}
              disabled={files.length === 0 || isGenerating}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all
                ${files.length === 0 || isGenerating 
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white transform hover:scale-[1.02]'
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" /> Generating {variationCount} Variations...
                </>
              ) : (
                <>
                  <Wand2 /> Generate Manga
                </>
              )}
            </button>
            
            {/* Helper text for Pro mode */}
            {useProModel && !hasApiKey && (
              <div className="text-center mt-3 p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
                <p className="text-xs text-yellow-500/80 mb-1">
                  Pro mode requires a paid Google Cloud Project API key.
                </p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                >
                  How to get a Paid API Key? &rarr;
                </a>
              </div>
            )}
            
             {/* Link to change key if already set */}
             {hasApiKey && (
               <button 
                onClick={handleSelectKey}
                className="w-full text-xs text-gray-500 hover:text-gray-300 underline mt-2"
               >
                 Change API Key
               </button>
             )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default App;