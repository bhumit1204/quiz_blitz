import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, count = 10, difficulty = 'medium' } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: 'Groq API key not configured. Set GROQ_API_KEY in environment variables.' }, { status: 500 });
    }

    const difficultyMap: Record<string, string> = {
      easy: 'simple and straightforward',
      medium: 'moderately challenging',
      hard: 'difficult and nuanced'
    };
    const difficultyDesc = difficultyMap[difficulty as string] || 'moderately challenging';

    const prompt = `Generate exactly ${count} ${difficultyDesc} multiple-choice quiz questions about "${topic}".

Return ONLY a valid JSON array with no markdown, no explanation, no preamble. Format:
[
  { 
    "text": "Question text here?", 
    "options": ["Option A", "Option B", "Option C", "Option D"], 
    "correctIndex": 0
  }
]

Rules:
- Each question must have exactly 4 options
- correctIndex is 0-3 (index of the correct option)
- Questions should be clear and unambiguous
- Options should be plausible but only one correct`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: 'You are a quiz question generator. You respond ONLY with valid JSON arrays. Never include markdown formatting, code blocks, or any text outside the JSON array.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4096,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error response:', errText);
      throw new Error(`Groq API error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from AI');
    }

    let parsedJson;
    try {
      // Strip any markdown code blocks if present
      const jsonStr = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim();
      parsedJson = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse JSON from Groq:", content);
      throw new Error("AI returned invalid format. Please try again.");
    }

    if (!Array.isArray(parsedJson)) {
      throw new Error("AI returned non-array response");
    }

    // Validate and sanitize each question
    const validated = parsedJson
      .filter((q: any) => q.text && Array.isArray(q.options) && q.options.length === 4 && typeof q.correctIndex === 'number')
      .map((q: any) => ({
        text: String(q.text),
        options: q.options.map((o: any) => String(o)),
        correctIndex: Math.min(3, Math.max(0, Math.floor(q.correctIndex))),
      }));

    if (validated.length === 0) {
      throw new Error("No valid questions generated. Please try again.");
    }

    return NextResponse.json({ questions: validated });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}