import React, { useState, useEffect } from 'react';
import { User } from '../types/auth';
import LoginPage from '../components/LoginPage';
import ChatInterface from '../components/ChatInterface';
import { supabase } from '@/integrations/supabase/client';
import { supabaseService } from '@/services/supabaseService';

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

    const documents = await supabaseService.getDocuments();

    // Translate Serbian query to English for better matching
    const translatedQuery = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Translate this to English, preserving only the core question meaning:"
          },
          {
            role: "user",
            content: message
          }
        ],
        temperature: 0.2
      })
    }).then(res => res.json()).then(json => json.choices[0].message.content.trim());

    let knowledgeBase = '';
    let sourcesUsed: string[] = [];

    if (documents.length > 0) {
      const result = findRelevantContent(translatedQuery, documents);
      knowledgeBase = result.chunks.join('\n\n');
      sourcesUsed = result.sources;

      if (sourcesUsed.length > 0) {
        knowledgeBase += `\n\n[Ovaj odgovor je baziran na: ${sourcesUsed.join(', ')}]`;
      }
    }

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
      return "Još uvek nemam nijedan dokument u svojoj bazi znanja. Zamolite administratora da doda dokumente kako bih mogao da pomažem korisnicima na osnovu njihovog sadržaja.";
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

const findRelevantContent = (query: string, documents: any[]): { chunks: string[], sources: string[] } => {
  const queryWords = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(' ')
    .filter(word => word.length > 2)
    .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'].includes(word));

  const scoredChunks: { chunk: string; score: number; source: string }[] = [];

  documents.forEach(doc => {
    const seen = new Set<string>();

    doc.chunks.forEach((chunk: string) => {
      const cleanChunk = chunk.trim();
      if (!cleanChunk || seen.has(cleanChunk)) return;
      seen.add(cleanChunk);

      const chunkLower = cleanChunk.toLowerCase();
      let score = 0;

      queryWords.forEach(word => {
        const exactMatches = (chunkLower.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        score += exactMatches * 3;

        const partialMatches = (chunkLower.match(new RegExp(word, 'g')) || []).length - exactMatches;
        score += partialMatches;
      });

      if (score > 0) {
        scoredChunks.push({
          chunk: cleanChunk,
          score,
          source: doc.name
        });
      }
    });
  });

  const topChunks = scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  const sourcesUsed = Array.from(new Set(topChunks.map(c => c.source)));

  const finalChunks = topChunks.map(c => `[Iz dokumenta: ${c.source}]\n${c.chunk}`);

  return { chunks: finalChunks, sources: sourcesUsed };
};

interface IndexProps {
  user?: User | null;
}

const Index: React.FC<IndexProps> = ({ user: initialUser }) => {
  const [user, setUser] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setIsLoading(false);
      return;
    }

    // Only set up auth listeners if no initial user provided
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            const profile = await supabaseService.getUserProfile(session.user.id);
            
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: profile ? `${profile.first_name} ${profile.last_name}` : session.user.email || '',
              firstName: profile?.first_name,
              lastName: profile?.last_name
            });
          } catch (error) {
            console.error('Error fetching user profile:', error);
            setUser({
              email: session.user.email || '',
              role: session.user.email === 'pixunit.nenad@gmail.com' ? 'admin' : 'user',
              name: session.user.email || '',
              firstName: undefined,
              lastName: undefined
            });
          }
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
      }
    };

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [initialUser]);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-purple-800">
      {user ? (
        <ChatInterface user={user} onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default Index;
