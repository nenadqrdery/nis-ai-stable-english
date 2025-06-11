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

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) return "Session missing or expired. Please log in again.";

    // STEP 1: Translate user input (if needed)
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
    }).then(res => res.json()).then(json => json.choices?.[0]?.message?.content?.trim() || message);

    // STEP 2: Match documents
    const matchRes = await fetch('https://pkqnrxzdgdegbhhlcjtj.supabase.co/functions/v1/match_documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: translatedQuery })
    });

    let matches: any[] = [];
    if (matchRes.ok) {
      const rawText = await matchRes.text();
      const parsed = JSON.parse(rawText);
      matches = parsed.matches ?? [];
    }

    const formattedDocs = matches
      .slice(0, 5)
      .map((m, i) => `=== Dokument ${i + 1} ===\n${m.chunk}`)
      .join('\n\n');

    // STEP 3: Detect script and set prompt language
    const isCyrillic = /[\u0400-\u04FF]/.test(message);
    const language = isCyrillic ? 'ćirilici' : 'latinici';

    const systemPrompt = `
Ti si prijateljski, ali stručan AI asistent zaposlenima na NIS benzinskim stanicama u Srbiji.
- Govori isključivo na srpskom jeziku, na ${language}.
- Objašnjavaš jasno i koristiš isključivo podatke iz baze znanja.
- Kada korisnik traži nastavak, koristi prethodni kontekst i relevantne informacije iz dokumenata.

Baza znanja:
${formattedDocs || '[Nema dostupnih dokumenata]'}
`.trim();

    // STEP 4: Build message history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(user?.lastInteraction ? [
        { role: 'user', content: user.lastInteraction.user },
        { role: 'assistant', content: user.lastInteraction.assistant }
      ] : []),
      { role: 'user', content: message }
    ];

    // STEP 5: Call GPT-4o
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages,
        temperature: 0.4,
        max_tokens: 1000,
        presence_penalty: 0.2,
        frequency_penalty: 0.2
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