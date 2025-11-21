import { GoogleGenAI } from "@google/genai";

/**
 * Converts a File object to a Base64 string suitable for the Gemini API.
 */
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64,")
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const generateMangaPage = async (
  imageFiles: File[],
  storyPrompt: string,
  isColor: boolean = true,
  useProModel: boolean = false,
  panelCount: string = "random",
  numberOfVariations: number = 1,
  aspectRatio: 'portrait' | 'landscape' = 'portrait'
): Promise<string[]> => {
  try {
    if (imageFiles.length === 0) {
      throw new Error("No image files provided");
    }

    // Initialize the client inside the function to ensure it uses the most current API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    let styleDescription = "";
    let colorRequirement = "";

    if (isColor) {
      styleDescription = "Japanese manga style, vibrant colors, cel shaded, webtoon style";
      colorRequirement = "Generate a high-quality, FULL-COLOR manga/comic book page layout.";
    } else {
      styleDescription = "Traditional Japanese manga style, black and white, high contrast, ink lines, screentones";
      colorRequirement = "Generate a high-quality, BLACK AND WHITE (monochrome) manga page layout with screentones.";
    }

    // Determine the story context
    const userStoryContext = storyPrompt.trim() 
      ? `Story Requirements: The page MUST depict the following scene/plot: "${storyPrompt}".` 
      : "Story Requirements: Show the characters in different poses or expressions suitable for a generic slice-of-life or action scene.";

    const subjectText = imageFiles.length > 1
      ? "Subject: The characters in the provided reference images. Include these distinct characters in the scene."
      : "Subject: The character in the provided reference image.";

    // Panel count logic
    const panelInstruction = panelCount === "random" 
      ? "Create a dynamic 3-5 panel layout on a single page."
      : panelCount === "1"
        ? "Create a single full-page splash panel illustration."
        : `Create a dynamic ${panelCount} panel layout on a single page.`;

    // Aspect Ratio Logic
    const ratioPrompt = aspectRatio === 'portrait'
      ? "Aspect Ratio: Vertical (Portrait) roughly 3:4."
      : "Aspect Ratio: Horizontal (Landscape) roughly 4:3.";

    // Prompt engineering for consistent character and layout
    const prompt = `
      ${colorRequirement}
      ${subjectText}
      ${userStoryContext}
      
      General Requirements:
      1. ${panelInstruction}
      2. MAINTAIN the facial features, hair, and clothing from the reference images as closely as possible.
      3. Style: ${styleDescription}.
      4. IMPORTANT: Do NOT include any text, speech bubbles, or sound effects. The image should be clean art only.
      5. ${ratioPrompt}
    `;

    const model = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    // Configure Aspect Ratio for both models
    const requestConfig: any = {
      imageConfig: {
        aspectRatio: aspectRatio === 'portrait' ? "3:4" : "4:3"
      }
    };
    
    // Add Pro-only configurations
    if (useProModel) {
      requestConfig.imageConfig.imageSize = "2K";
    }

    // Prepare content parts: Prompt + All Images
    const parts: any[] = [
      { text: prompt }
    ];

    for (const file of imageFiles) {
      const imageBase64 = await fileToGenerativePart(file);
      parts.push({
        inlineData: {
          mimeType: file.type,
          data: imageBase64,
        },
      });
    }

    // Helper function to perform a single generation request with retry logic
    const generateSingleImage = async (retryCount = 0): Promise<string | null> => {
      try {
        const response = await ai.models.generateContent({
          model: model, 
          contents: {
            parts: parts,
          },
          config: requestConfig,
        });

        if (response.candidates && response.candidates.length > 0) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              return `data:image/png;base64,${part.inlineData.data}`;
            }
          }
        }
        return null;
      } catch (e: any) {
        console.warn(`Generation attempt ${retryCount + 1} failed:`, e.message);
        
        // Check for 429 Rate Limit or 503 Service Unavailable
        // Specifically handle "RESOURCE_EXHAUSTED" which is the standard Google Cloud error for quota
        const status = e.status || e.response?.status || e.code;
        const msg = (e.message || '').toLowerCase();
        
        // Terminal errors: 400 Bad Request, 401 Unauthorized, 403 Forbidden (Permission)
        const isTerminal = status === 400 || status === 401 || status === 403;

        // We consider everything else retryable, especially 429 and 503
        const isRetryable = !isTerminal;
        
        // Increase retry count to 4 and use aggressive backoff
        if (isRetryable && retryCount < 4) {
          // Super Aggressive Backoff: 10s, 20s, 40s, 80s
          // This is necessary because the Free Tier limits are often measured in Requests Per Minute (RPM)
          // Waiting 10s+ gives the bucket a chance to refill.
          const delay = 10000 * Math.pow(2, retryCount); 
          console.log(`Rate limit or Server Error (${status}). Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return generateSingleImage(retryCount + 1);
        }
        
        return null;
      }
    };

    // Run requests SEQUENTIALLY to avoid QPS limits
    const validImages: string[] = [];
    
    for (let i = 0; i < numberOfVariations; i++) {
      // Significant pause between variations to allow quota refill
      // 10 seconds wait between images to stay under typical 2-5 RPM limits
      if (i > 0) {
        console.log("Pausing 10s before next variation to respect quota...");
        await new Promise(resolve => setTimeout(resolve, 10000));
      }

      const img = await generateSingleImage();
      if (img) {
        validImages.push(img);
      } else {
        // If we failed a request (after all retries), we likely hit a hard limit.
        // Stop trying to generate more variations to avoid further errors.
        console.warn("Skipping remaining variations due to repeated errors.");
        // Break the loop, but we will return whatever images we managed to generate
        break;
      }
    }

    // Partial Success Handling:
    // If we have at least 1 image, return it. Don't fail the whole batch just because image #2 or #3 failed.
    if (validImages.length === 0) {
      throw new Error("Failed to generate images. You may have exceeded your API quota. Please wait a moment or use a different API key.");
    }

    return validImages;

  } catch (error) {
    console.error("Error generating manga page:", error);
    throw error;
  }
};