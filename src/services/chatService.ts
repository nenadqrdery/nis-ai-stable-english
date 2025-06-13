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

    if (!token) {
      return "Session missing or expired. Please log in again.";
    }

    // STEP 1 — Translate query
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

    // STEP 2 — Call match_documents
    let knowledgeBase = '';
    const matchRes = await fetch('https://pkqnrxzdgdegbhhlcjtj.supabase.co/functions/v1/match_documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: translatedQuery })
    });

    if (matchRes.ok) {
      const rawText = await matchRes.text();
      console.log("📦 Match result raw:", rawText);
      const { matches } = JSON.parse(rawText);
      if (Array.isArray(matches) && matches.length > 0) {
        knowledgeBase = matches.map(m => m.chunk).join('\n\n');
      } else {
        console.warn("⚠️ No document matches found.");
      }
    } else {
      const err = await matchRes.text();
      console.warn("❌ match_documents failed:", err);
    }

    // STEP 3 — Script + fallback handling
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
Ti si stručan i prijateljski AI asistent zaposlenima na NIS benzinskim stanicama u Srbiji.

Tvoje osobine:
- Razumeš kontekst prethodnih poruka i nastavljaš razgovor prirodno.
- Kada korisnik traži pojašnjenje ili nastavak (npr. "pričaj još", "objasni", "o toj temi"), koristi relevantne informacije iz baze znanja.
- Ne kopiraš tekstove doslovno, već ih prenosiš jasno, kao kolega koji objašnjava stvar.
- Kada neko ne zna kako da formuliše pitanje, ti im pomažeš da ga preciziraju.

Pravila:
- Odgovaraj isključivo na srpskom jeziku.
- Ako korisnik koristi ćirilicu, i ti koristiš ćirilicu.
- Ako koristi latinicu, koristi i ti latinicu.
- Nikada ne koristi engleski jezik.
- Informacije crpi samo iz baze znanja ispod.

Baza znanja:
${knowledgeBase || '[Nema dostupnog konteksta.]'}

Odgovaraj jasno, korisno, i ljudski — kao kolega koji zna proceduru, ali i razume osobu kojoj pomaže.`;

    // STEP 4 — Build context-aware message history
    const contextHistory = [
      { role: 'system', content: systemPrompt }
    ];

    if (user?.lastInteraction) {
      contextHistory.push({ role: 'user', content: user.lastInteraction.user });
      contextHistory.push({ role: 'assistant', content: user.lastInteraction.assistant });
    }

    contextHistory.push({ role: 'user', content: message });

    // STEP 5 — Ask OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: contextHistory,
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