// 自定义 Gemini API 服务适配器
// 用于支持自部署的 Gemini 轮询服务

import type { GeneratedContent } from '../types';

const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.GEMINI_API_BASE_URL || 'https://yqdkzwnuarth.eu-central-1.clawcloudrun.com';

if (!API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

// 检查是否使用自定义端点
export const isCustomEndpoint = BASE_URL !== 'https://generativelanguage.googleapis.com';

export async function callCustomGeminiAPI(
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

export async function callCustomVideoAPI(
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