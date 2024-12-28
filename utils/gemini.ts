import { model, defaultConfig, genAI } from './gemini-config';

const COOKING_ASSISTANT_PROMPT = `You are a friendly and knowledgeable cooking assistant. Your role is to:
1. Provide recipe suggestions and cooking tips
2. Help with ingredient substitutions and measurement conversions
3. Explain cooking techniques and terminology
4. Offer meal planning and dietary advice
5. Share food safety guidelines

Format your responses using markdown:
- Use **bold** for important terms or ingredients
- Use bullet points or numbered lists for steps or multiple items
- Use \`code blocks\` for measurements or temperatures
- Use ### for section headers when providing detailed information
- Include line breaks between sections for better readability

Keep responses concise but informative. If a user asks about something outside of cooking and food, politely redirect them to cooking-related topics.`;

export async function generateRecipeDescription(ingredients: string[], instructions: string) {
  const prompt = `Given these ingredients: ${ingredients.join(', ')} and cooking instructions: ${instructions}, 
    provide a brief, engaging description of this recipe in 2-3 sentences.`;
  
  try {
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error('Error generating recipe description:', error);
    return '';
  }
}

export async function suggestRecipeImprovements(recipe: string) {
  const prompt = `As a culinary expert, analyze this recipe and suggest 2-3 ways to improve it or make it more interesting:
    ${recipe}`;
  
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: defaultConfig,
    });
    return result.response.text();
  } catch (error: any) {
    console.error('Error generating recipe improvements:', error);
    return '';
  }
}

export async function generateCookingTips(ingredients: string[]) {
  const prompt = `Provide 2-3 professional cooking tips specifically for working with these ingredients: ${ingredients.join(', ')}`;
  
  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: defaultConfig,
    });
    return result.response.text();
  } catch (error: any) {
    console.error('Error generating cooking tips:', error);
    return '';
  }
}

export async function startCookingAssistantChat() {
  return model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "System: " + COOKING_ASSISTANT_PROMPT }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I'll act as your cooking assistant with those guidelines." }],
      },
      {
        role: "user",
        parts: [{ text: "Hello, I need help with cooking." }],
      },
      {
        role: "model",
        parts: [{ text: "Hi! I'm your cooking assistant. I can help you with recipe suggestions, cooking techniques, and ingredient substitutions. What would you like to know?" }],
      },
    ],
  });
}

export async function analyzeRecipeImage(imageData: string, categories: { id: number; name: string }[]) {
  console.log('🚀 Initializing Gemini analysis...');
  const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Using pro-vision for image analysis
  
  console.log('📝 Preparing prompt...');
  const categoryGuide = categories.map(cat => `${cat.id}: ${cat.name}`).join(', ');
  
  const prompt = `Analyze this food image and provide a structured recipe in the following JSON format:
  {
    "name": "Recipe name",
    "description": "Brief description",
    "category_id": number, // Choose from these categories: ${categoryGuide}
    "ingredients": [
      {
        "name": "ingredient name",
        "quantity": estimated_quantity,
        "unit": "g/ml/pieces/etc"
      }
    ],
    "instructions": [
      {
        "stepNumber": 1,
        "instruction": "step description"
      }
    ],
    "prep_time_minutes": estimated_prep_time,
    "cook_time_minutes": estimated_cook_time,
    "servings": estimated_servings,
    "difficulty_level": "easy/medium/hard"
  }

  Be as accurate as possible in identifying ingredients and steps. Provide reasonable estimates for quantities and times.
  Important: For category_id, ONLY use one of the provided category IDs: ${categoryGuide}`;

  try {
    console.log('📸 Preparing image data for Gemini...');
    const imageInput = {
      inlineData: {
        data: imageData,
        mimeType: "image/jpeg"
      }
    };
    console.log('🔍 Image data prepared:', {
      dataLength: imageData.length,
      mimeType: imageInput.inlineData.mimeType
    });

    console.log('🤖 Sending request to Gemini...');
    const result = await visionModel.generateContent([prompt, imageInput]);
    console.log('✅ Received response from Gemini');

    const response = await result.response.text();
    console.log('📜 Raw response:', response);

    try {
      console.log('🔄 Processing JSON response...');
      // Sometimes Gemini might include markdown code blocks, so we need to clean the response
      const cleanJson = response.replace(/```json\n?|\n?```/g, '').trim();
      console.log('🧹 Cleaned JSON:', cleanJson);

      const parsedData = JSON.parse(cleanJson);
      console.log('✨ Successfully parsed JSON response');
      return parsedData;
    } catch (parseError: any) {
      console.error('❌ Error parsing Gemini response:', {
        error: parseError,
        rawResponse: response,
        cleanedResponse: response.replace(/```json\n?|\n?```/g, '').trim()
      });
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error during Gemini analysis:', {
      error,
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack
    });
    return null;
  }
}
