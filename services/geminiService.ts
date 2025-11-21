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
  useProModel: boolean = false
): Promise<string> => {
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

    // Prompt engineering for consistent character and layout
    const prompt = `
      ${colorRequirement}
      ${subjectText}
      ${userStoryContext}
      
      General Requirements:
      1. Create a dynamic 3-5 panel layout on a single page.
      2. MAINTAIN the facial features, hair, and clothing from the reference images as closely as possible.
      3. Style: ${styleDescription}.
      4. IMPORTANT: Do NOT include any text, speech bubbles, or sound effects. The image should be clean art only.
      5. Aspect Ratio: Vertical (Portrait) roughly 3:4.
    `;

    const model = useProModel ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    
    const requestConfig: any = {};
    
    // Image config is only supported on Pro model
    if (useProModel) {
      requestConfig.imageConfig = {
        aspectRatio: "3:4",
        imageSize: "2K", 
      };
    } else {
      // Flash model config logic if needed in future
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

    const response = await ai.models.generateContent({
      model: model, 
      contents: {
        parts: parts,
      },
      config: requestConfig,
    });

    // Iterate through parts to find the image
    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating manga page:", error);
    throw error;
  }
};