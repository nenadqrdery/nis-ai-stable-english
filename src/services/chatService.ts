
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
    // Get API key
    const apiKey = localStorage.getItem('openai-api-key');
    if (!apiKey) {
      return "I need an OpenAI API key to function. Please ask an admin to configure it in the document upload section.";
    }

    // Get knowledge base
    const documents = localStorage.getItem('knowledge-base-documents');
    let knowledgeBase = '';
    
    if (documents) {
      const docs = JSON.parse(documents);
      // Simple similarity search - in a real app, you'd use embeddings
      const relevantChunks = findRelevantContent(message, docs);
      knowledgeBase = relevantChunks.join('\n\n');
    }

    if (!knowledgeBase.trim()) {
      return "I don't have any documents in my knowledge base yet. Please ask an admin to upload some documents so I can help answer your questions based on that content.";
    }

    // Prepare the prompt
    const systemPrompt = `You are a helpful AI assistant that answers questions based solely on the provided knowledge base. 
    You should:
    - Only answer based on the information provided in the knowledge base
    - Be conversational and helpful
    - If the information isn't in the knowledge base, say so politely
    - Provide specific references when possible
    - Be concise but thorough

    Knowledge Base:
    ${knowledgeBase}`;

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
        max_tokens: 1000
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
  // Simple keyword-based search (in a real app, you'd use embeddings and vector search)
  const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
  const scoredChunks: { chunk: string; score: number }[] = [];

  documents.forEach(doc => {
    doc.chunks.forEach((chunk: string) => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      queryWords.forEach(word => {
        const matches = (chunkLower.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
      
      if (score > 0) {
        scoredChunks.push({ chunk, score });
      }
    });
  });

  // Sort by relevance and return top chunks
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.chunk);
};
