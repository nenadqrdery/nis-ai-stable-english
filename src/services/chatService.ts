
import { supabaseService } from './supabaseService';

export const generateChatTitle = (firstMessage: string): string => {
  // Simple title generation from first message
  const words = firstMessage.split(' ').slice(0, 5);
  let title = words.join(' ');
  if (firstMessage.split(' ').length > 5) {
    title += '...';
  }
  return title || 'New Chat';
};

export const generateResponse = async (message: string, user: any): Promise<string> => {
  try {
    // Get API key from Supabase
    const apiKey = await supabaseService.getApiKey();
    if (!apiKey) {
      return "I need an OpenAI API key to function. Please ask an admin to configure it in the document upload section.";
    }

    // Get documents from Supabase
    const documents = await supabaseService.getDocuments();
    let knowledgeBase = '';
    
    if (documents.length > 0) {
      // Improved similarity search
      const relevantChunks = findRelevantContent(message, documents);
      knowledgeBase = relevantChunks.join('\n\n');
    }

    if (!knowledgeBase.trim()) {
      return "I don't have any documents in my knowledge base yet. Please ask an admin to upload some documents so I can help answer your questions based on that content.";
    }

    // Detect the language of the user's message
    const detectedLanguage = detectLanguage(message);

    // Improved system prompt for more human-like responses
    const systemPrompt = `You are a knowledgeable and helpful AI assistant that provides human-like answers based strictly on the provided knowledge base. 

    Key guidelines:
    - Answer ONLY based on the information in the knowledge base below
    - Be conversational, warm, and engaging in your responses
    - Respond in the same language as the user's question (detected language: ${detectedLanguage})
    - If information isn't in the knowledge base, politely explain that you don't have that specific information
    - Provide context and explain concepts as if you're a knowledgeable colleague who has read these documents
    - Use natural language and avoid robotic responses
    - When relevant, reference specific parts of the documents
    - Be concise but thorough in your explanations

    Knowledge Base:
    ${knowledgeBase}

    Remember: Always respond in ${detectedLanguage} and maintain a helpful, human-like tone while staying strictly within the bounds of the provided knowledge base.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
    
  } catch (error) {
    console.error('Error generating response:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "There seems to be an issue with the OpenAI API key. Please check that it's valid and has sufficient credits.";
      }
      return `Sorry, I encountered an error: ${error.message}`;
    }
    return "I'm sorry, I encountered an unexpected error. Please try again.";
  }
};

const findRelevantContent = (query: string, documents: any[]): string[] => {
  // Enhanced keyword-based search with better scoring
  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));
  
  const scoredChunks: { chunk: string; score: number; source: string }[] = [];

  documents.forEach(doc => {
    doc.chunks.forEach((chunk: string) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        // Exact word matches
        const exactMatches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += exactMatches * 3;
        
        // Partial matches
        const partialMatches = (chunkLower.match(new RegExp(word, 'g')) || []).length - exactMatches;
        score += partialMatches;
      });
      
      if (score > 0) {
        scoredChunks.push({ 
          chunk: `[From ${doc.name}]: ${chunk}`, 
          score,
          source: doc.name 
        });
      }
    });
  });

  // Sort by relevance and return top chunks
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 8) // Increased from 5 to 8 for better context
    .map(item => item.chunk);
};

const detectLanguage = (text: string): string => {
  // Simple language detection based on common patterns
  const patterns = {
    'Spanish': /\b(el|la|los|las|de|en|y|a|que|es|se|no|te|le|da|su|por|son|con|para|una|tiene|más|como|pero|sus|había|muy|fue|está|todo|han|su|hacer|tiempo)\b/gi,
    'French': /\b(le|la|les|de|et|à|un|une|il|elle|dans|que|qui|avec|ne|se|sur|être|avoir|pour|ce|tout|par|son|cette|ou|mais|comme|faire|leur|bien|deux|même|notre)\b/gi,
    'German': /\b(der|die|das|und|in|den|von|zu|mit|sich|auf|für|ist|im|des|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer)\b/gi,
    'Italian': /\b(il|la|di|che|e|a|un|in|per|con|non|una|su|le|del|è|da|nel|al|alla|sono|si è|più|anche|come|ma|degli|dalle|della)\b/gi,
    'Portuguese': /\b(de|a|o|que|e|do|da|em|um|para|é|com|não|uma|os|no|se|na|por|mais|as|dos|como|mas|foi|ao|ele|das|tem|à|seu|sua)\b/gi,
  };

  for (const [language, pattern] of Object.entries(patterns)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 2) {
      return language;
    }
  }

  return 'English'; // Default to English
};
