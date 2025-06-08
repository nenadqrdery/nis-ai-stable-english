
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

    // Detect the script of the user's message (Cyrillic or Latin)
    const isCyrillic = /[\u0400-\u04FF]/.test(message);
    const script = isCyrillic ? 'Cyrillic' : 'Latin';

    // Serbian-only system prompt with script matching
    const systemPrompt = `
Ti si koristan i pouzdan AI asistent za zaposlene na NIS benzinskim stanicama u Srbiji.

Uputstva:
- Odgovaraj ISKLJUČIVO na srpskom jeziku.
- Ako korisnik piše ćirilicom, odgovaraj ćirilicom.
- Ako korisnik piše latinicom, odgovaraj latinicom.
- Ne koristi engleski jezik ni u kom slučaju.
- Odgovaraj isključivo na osnovu sadržaja u bazi znanja ispod.
- Budi profesionalan, jasan i kolegijalan u tonu.

Baza znanja:
${knowledgeBase}

Zapamti: Odgovaraj isključivo na srpskom jeziku, koristeći ${script} pismo.`;

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
    return data.choices[0]?.message?.content || "Nisam uspeo da generišem odgovor. Pokušajte ponovo.";

  } catch (error) {
    console.error('Error generating response:', error);
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return "Došlo je do problema sa OpenAI API ključem. Proverite da li je ispravan i da li imate dovoljno kredita.";
      }
      return `Izvinite, došlo je do greške: ${error.message}`;
    }
    return "Izvinite, došlo je do neočekivane greške. Pokušajte ponovo kasnije.";
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
