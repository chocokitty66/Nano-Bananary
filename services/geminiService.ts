import { GoogleGenAI, Modality } from "@google/genai";
import type { GeneratedContent } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

// 检查是否使用自定义 API 端点
const isCustomEndpoint = process.env.GEMINI_API_BASE_URL && 
  process.env.GEMINI_API_BASE_URL !== 'https://generativelanguage.googleapis.com';

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://yqdkzwnuarth.eu-central-1.clawcloudrun.com';

let ai: GoogleGenAI;

if (isCustomEndpoint) {
  console.log('Using custom Gemini API endpoint:', BASE_URL);
  ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

// 自定义 API 调用函数
async function callCustomGeminiAPI(
  base64ImageData: string,
  mimeType: string,
  prompt: string,
  maskBase64: string | null,
  secondaryImage: { base64: string; mimeType: string } | null
): Promise<GeneratedContent> {
  try {
    const parts: any[] = [
      {
        inline_data: {
          data: base64ImageData,
          mime_type: mimeType,
        },
      },
    ];

    let fullPrompt = prompt;
    if (maskBase64) {
      parts.push({
        inline_data: {
          data: maskBase64,
          mime_type: 'image/png',
        },
      });
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
    }
    
    if (secondaryImage) {
      parts.push({
        inline_data: {
          data: secondaryImage.base64,
          mime_type: secondaryImage.mimeType,
        },
      });
    }

    parts.push({ text: fullPrompt });

    const requestBody = {
      contents: [{ parts }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    };

    const response = await fetch(`${BASE_URL}/v1beta/models/gemini-2.5-flash-image-preview:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    const result: GeneratedContent = { imageUrl: null, text: null };
    const responseParts = data.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.text) {
          result.text = (result.text ? result.text + "\n" : "") + part.text;
        } else if (part.inlineData || part.inline_data) {
          const inlineData = part.inlineData || part.inline_data;
          result.imageUrl = `data:${inlineData.mimeType || inlineData.mime_type};base64,${inlineData.data}`;
        }
      }
    }

    if (!result.imageUrl) {
      let errorMessage;
      if (result.text) {
        errorMessage = `The model responded: "${result.text}"`;
      } else {
        const finishReason = data.candidates?.[0]?.finishReason;
        errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
        
        if (finishReason === 'SAFETY') {
          errorMessage = "The request was blocked for safety reasons. Please modify your prompt or image.";
        }
      }
      throw new Error(errorMessage);
    }

    return result;

  } catch (error) {
    console.error("Error calling custom Gemini API:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred while communicating with the custom API.");
  }
}

export async function editImage(
    base64ImageData: string, 
    mimeType: string, 
    prompt: string,
    maskBase64: string | null,
    secondaryImage: { base64: string; mimeType: string } | null
): Promise<GeneratedContent> {
  // 如果使用自定义端点，使用自定义 API 调用
  if (isCustomEndpoint) {
    return callCustomGeminiAPI(base64ImageData, mimeType, prompt, maskBase64, secondaryImage);
  }

  // 原有的 Google GenAI 逻辑
  try {
    let fullPrompt = prompt;
    const parts: any[] = [
      {
        inlineData: {
          data: base64ImageData,
          mimeType: mimeType,
        },
      },
    ];

    if (maskBase64) {
      parts.push({
        inlineData: {
          data: maskBase64,
          mimeType: 'image/png',
        },
      });
      fullPrompt = `Apply the following instruction only to the masked area of the image: "${prompt}". Preserve the unmasked area.`;
    }
    
    if (secondaryImage) {
        parts.push({
            inlineData: {
                data: secondaryImage.base64,
                mimeType: secondaryImage.mimeType,
            },
        });
    }

    parts.push({ text: fullPrompt });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const result: GeneratedContent = { imageUrl: null, text: null };
    const responseParts = response.candidates?.[0]?.content?.parts;

    if (responseParts) {
      for (const part of responseParts) {
        if (part.text) {
          result.text = (result.text ? result.text + "\n" : "") + part.text;
        } else if (part.inlineData) {
          result.imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }

    if (!result.imageUrl) {
        let errorMessage;
        if (result.text) {
            errorMessage = `The model responded: "${result.text}"`;
        } else {
            const finishReason = response.candidates?.[0]?.finishReason;
            const safetyRatings = response.candidates?.[0]?.safetyRatings;
            errorMessage = "The model did not return an image. It might have refused the request. Please try a different image or prompt.";
            
            if (finishReason === 'SAFETY') {
                const blockedCategories = safetyRatings?.filter(r => r.blocked).map(r => r.category).join(', ');
                errorMessage = `The request was blocked for safety reasons. Categories: ${blockedCategories || 'Unknown'}. Please modify your prompt or image.`;
            }
        }
        throw new Error(errorMessage);
    }

    return result;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        let errorMessage = error.message;
        try {
            const parsedError = JSON.parse(errorMessage);
            if (parsedError.error && parsedError.error.message) {
                if (parsedError.error.status === 'RESOURCE_EXHAUSTED') {
                    errorMessage = "You've likely exceeded the request limit. Please wait a moment before trying again.";
                } else if (parsedError.error.code === 500 || parsedError.error.status === 'UNKNOWN') {
                    errorMessage = "An unexpected server error occurred. This might be a temporary issue. Please try again in a few moments.";
                } else {
                    errorMessage = parsedError.error.message;
                }
            }
        } catch (e) {}
        throw new Error(errorMessage);
    }
    throw new Error("An unknown error occurred while communicating with the API.");
  }
}

export async function generateVideo(
    prompt: string,
    image: { base64: string; mimeType: string } | null,
    aspectRatio: '16:9' | '9:16',
    onProgress: (message: string) => void
): Promise<string> {
    // 如果使用自定义端点，使用自定义视频 API
    if (isCustomEndpoint) {
        return callCustomVideoAPI(prompt, image, aspectRatio, onProgress);
    }

    // 原有的 Google GenAI 视频生成逻辑
    try {
        onProgress("Initializing video generation...");

        const request = {
            model: 'veo-2.0-generate-001',
            prompt: prompt,
            config: {
                numberOfVideos: 1,
                aspectRatio: aspectRatio
            },
            ...(image && {
                image: {
                    imageBytes: image.base64,
                    mimeType: image.mimeType
                }
            })
        };

        let operation = await ai.models.generateVideos(request);
        
        onProgress("Polling for results, this may take a few minutes...");

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            throw new Error(operation.error.message || "Video generation failed during operation.");
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

        if (!downloadLink) {
            throw new Error("Video generation completed, but no download link was found.");
        }

        return `${downloadLink}&key=${API_KEY}`;

    } catch (error) {
        console.error("Error calling Video Generation API:", error);
        if (error instanceof Error) {
            let errorMessage = error.message;
            try {
                const parsedError = JSON.parse(errorMessage);
                if (parsedError.error && parsedError.error.message) {
                    errorMessage = parsedError.error.message;
                }
            } catch (e) {}
            throw new Error(errorMessage);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
}

// 自定义视频 API 调用函数
async function callCustomVideoAPI(
  prompt: string,
  image: { base64: string; mimeType: string } | null,
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void
): Promise<string> {
  try {
    onProgress("Initializing video generation with custom endpoint...");

    const requestBody: any = {
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        aspectRatio: aspectRatio
      }
    };

    if (image) {
      requestBody.image = {
        imageBytes: image.base64,
        mimeType: image.mimeType
      };
    }

    const response = await fetch(`${BASE_URL}/v1beta/models/veo-2.0-generate-001:generateVideos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'x-goog-api-key': API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Video API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const operationData = await response.json();
    let operation = operationData;
    
    onProgress("Polling for results, this may take a few minutes...");

    // 轮询操作状态
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const pollResponse = await fetch(`${BASE_URL}/v1beta/operations/${operation.name}`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'x-goog-api-key': API_KEY,
        },
      });

      if (pollResponse.ok) {
        operation = await pollResponse.json();
      }
    }

    if (operation.error) {
      throw new Error(operation.error.message || "Video generation failed during operation.");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      throw new Error("Video generation completed, but no download link was found.");
    }

    return `${downloadLink}&key=${API_KEY}`;

  } catch (error) {
    console.error("Error calling custom Video Generation API:", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("An unknown error occurred during video generation.");
  }
}