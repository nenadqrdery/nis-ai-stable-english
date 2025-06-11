export const generateResponse = async (message: string, user: any): Promise<string> => {
  try {
    const apiKey = await supabaseService.getApiKey();
    if (!apiKey) {
      return "I need an OpenAI API key to function. Please ask an admin to configure it.";
    }

    const session = await supabase.auth.getSession();
    const token = session.data.session?.access_token;

    if (!token) {
      return "Session missing or expired. Please log in again.";
    }

    // Step 1: Translate user query
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
    }).then(res => res.json()).then(json => json.choices?.[0]?.message?.content?.trim() || message);

    // Step 2: Call match_documents Edge Function
    const matchRes = await fetch('/functions/v1/match_documents', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query: translatedQuery })
    });

    let knowledgeBase = '';
    if (matchRes.ok) {
      const { matches } = await matchRes.json();
      knowledgeBase = matches.map(m => m.chunk).join('\n\n');
    } else {
      const err = await matchRes.text();
      console.warn('Edge Function match_documents failed:', err);
    }

    const normalize = (text: string) => text
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z\s]/gi, '')
      .trim();

    const isCyrillic = /[\u0400-\u04FF]/.test(message);
    const script = isCyrillic ? 'Cyrillic' : 'Latin';
    const followUpTriggers = ['jos', 'nastavi', 'dalje', 'daj jos', 'nastavi dalje'];
    const isFollowUp = followUpTriggers.some(t => normalize(message).includes(t));

    if (!knowledgeBase.trim() && !isFollowUp) {
      return "Još uvek nemam nijedan dokument u svojoj bazi znanja. Zamolite administratora da doda dokumente.";
    }

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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`OpenAI API error: ${err.error?.message}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "Nisam uspeo da generišem odgovor. Pokušajte ponovo.";
  } catch (error) {
    console.error("Error generating response:", error);
    return "Greška prilikom generisanja odgovora. Pokušajte ponovo.";
  }
};