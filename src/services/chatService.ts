import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from './supabaseService';

export const generateChatTitle = (firstMessage: string): string => {
  const words = firstMessage.split(' ').slice(0, 5);
  let title = words.join(' ');
  if (firstMessage.split(' ').length > 5) {
    title += '...';
  }
  return title || 'New Chat';
};

export const generateResponse = async (message: string, user: any): Promise<string> => {
  try {
    const apiKey = await supabaseService.getApiKey();
    if (!apiKey) {
      return "I need an OpenAI API key to function. Please ask an admin to configure it in the document upload section.";
    }

    // Translate to English
    const translatedQuery = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Translate this to English, preserving only the core question meaning:" },
          { role: "user", content: message }
        ],
        temperature: 0.2
      })
    }).then(res => res.json()).then(json => json.choices[0].message.content.trim());

    // Embed query
    const embeddingRes = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "text-embedding-ada-002",
        input: translatedQuery
      })
    });

    const embeddingData = await embeddingRes.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // Vector search
    const { data: matches, error } = await supabase.rpc("match_documents", {
      query_embedding: queryEmbedding,
      match_threshold: 0.75,
      match_count: 10
    });

    if (error) {
      console.error("Supabase match_documents error:", error);
    }

    let knowledgeBase = (matches || []).map(m => m.content).join('\n\n');

    // Handle fallback logic
    const normalize = (text: string) => text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z\s]/gi, '')
      .trim();

    const normalized = normalize(message);
    const followUpTriggers = ['jos', 'nastavi', 'dalje', 'daj jos', 'nastavi dalje'];
    const isFollowUp = followUpTriggers.some(trigger => normalized.includes(trigger));

    if (!knowledgeBase.trim() && !isFollowUp) {
      // fallback: keyword matching
      const documents = await supabaseService.getDocuments();
      const fallbackChunks: string[] = [];

      const queryWords = translatedQuery
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(' ')
        .filter(word => word.length > 2);

      documents.forEach(doc => {
        doc.chunks?.forEach((chunk: string) => {
          const lowerChunk = chunk.toLowerCase();
          const matchScore = queryWords.reduce((acc, word) => {
            return acc + (lowerChunk.includes(word) ? 1 : 0);
          }, 0);

          if (matchScore > 1) {
            fallbackChunks.push(`[From ${doc.name}]: ${chunk}`);
          }
        });
      });

      if (fallbackChunks.length === 0) {
        return "Nisam pronašao informacije koje odgovaraju vašem pitanju u dostupnim dokumentima.";
      }

      knowledgeBase = fallbackChunks.slice(0, 8).join('\n\n');
    }

    const isCyrillic = /[\u0400-\u04FF]/.test(message);
    const script = isCyrillic ? 'Cyrillic' : 'Latin';

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
${knowledgeBase || '[Kontekst je nastavak prethodnog razgovora.]'}

Zapamti: Odgovaraj isključivo na srpskom jeziku, koristeći ${script} pismo.`;

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
  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));

  const scoredChunks: { chunk: string; score: number; source: string }[] = [];

  documents.forEach(doc => {
    const uniqueChunks = new Set<string>();

    doc.chunks.forEach((chunk: string) => {
      const cleanedChunk = chunk.trim();
      if (!cleanedChunk || uniqueChunks.has(cleanedChunk)) return;

      uniqueChunks.add(cleanedChunk);

      const chunkLower = cleanedChunk.toLowerCase();
      let score = 0;

      queryWords.forEach(word => {
        const exactMatches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += exactMatches * 3;

        const partialMatches = (chunkLower.match(new RegExp(word, 'g')) || []).length - exactMatches;
        score += partialMatches;
      });

      if (score > 0) {
        scoredChunks.push({
          chunk: `[From ${doc.name}]: ${cleanedChunk}`,
          score,
          source: doc.name
        });
      }
    });
  });

  // Sort globally across all documents and return top N chunks (from multiple files)
  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.chunk);
};