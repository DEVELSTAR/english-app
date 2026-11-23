import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';
import { requireAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const router = Router();

const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
];

const DEFAULT_SYSTEM_INSTRUCTION = `
You are "Akib Sir", an expert, warm, and highly encouraging English speaking tutor dedicated to helping learners in India bridge the gap from spoken Hindi / Hinglish into natural, confident English.

Personality & Rules:
1. Explain concepts simply in accessible English, sprinkling friendly Hinglish whenever helpful (e.g., "Bilkul sahi!", "Don't worry, let's fix that together!").
2. Always give concrete, real-life conversational examples suitable for everyday life, office meetings, college, or ordering food.
3. If the student makes a grammatical error or translates literally from Hindi (e.g. "What is your good name?" or "I will revert back"), gently highlight the mistake, give the natural English sentence, and explain WHY.
4. Keep answers crisp, structured, and easy to read aloud. Avoid long dense academic essays. Use bullet points and bold text.
5. If the user provides audio or asks for pronunciation help, break down the sounds phonetically.
`;

let cachedModel = null;

// AI Chat Endpoint
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const { lesson_id, messages, user_message, audio_data } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'Missing Google Gemini API key. Please configure GEMINI_API_KEY in the server .env.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const candidates = [];
    if (process.env.GEMINI_MODEL) candidates.push(process.env.GEMINI_MODEL.trim());
    if (cachedModel && !candidates.includes(cachedModel)) candidates.push(cachedModel);
    for (const m of DEFAULT_MODELS) {
      if (!candidates.includes(m)) candidates.push(m);
    }

    let reply = '';
    let usedModel = '';
    let lastError = null;

    // Fetch lesson context if lesson_id provided, otherwise private tutor mode
    let systemInstruction = DEFAULT_SYSTEM_INSTRUCTION;
    if (lesson_id) {
      try {
        const [lRows] = await pool.query('SELECT title, topic, content FROM lessons WHERE id = ?', [lesson_id]);
        if (lRows.length > 0) {
          systemInstruction = `${DEFAULT_SYSTEM_INSTRUCTION}\nCurrent Lesson: "${lRows[0].title}" (Topic: ${lRows[0].topic || 'General'}).`;
        }
      } catch {
        // ignore
      }
    } else {
      systemInstruction = `${DEFAULT_SYSTEM_INSTRUCTION}\nMode: You are the student's personal, 1-on-1 private English speaking tutor. Help them converse fluently, fix grammar mistakes, practice conversational roleplays (interviews, ordering food, meetings, travel), and speak natural English without translating from Hindi.`;
    }

    for (const modelName of candidates) {
      try {
        const model = genAI.getGenerativeModel(
          {
            model: modelName,
            systemInstruction: { parts: [{ text: systemInstruction }] },
          },
          { apiVersion: 'v1' }
        );

        const history = (messages || []).map((m) => ({
          role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history });

        let result;
        if (audio_data?.base64) {
          const parts = [
            {
              inlineData: {
                mimeType: audio_data.mimeType || 'audio/webm',
                data: audio_data.base64,
              },
            },
          ];
          if (user_message) parts.push({ text: user_message });
          else parts.push({ text: 'Please listen to my speech, check my fluency/pronunciation, and reply as Akib Sir.' });
          result = await chat.sendMessage(parts);
        } else {
          result = await chat.sendMessage(user_message || 'Hello Akib Sir!');
        }

        const text = result.response.text();
        if (text) {
          reply = text;
          usedModel = modelName;
          cachedModel = modelName;
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Gemini Fallback] Model ${modelName} failed:`, err?.message);
      }
    }

    if (!reply) {
      throw lastError || new Error('All Gemini model candidates failed to return a response.');
    }

    // Persist messages to lesson_chat_messages (supports both lesson and private homepage chat)
    try {
      const lid = lesson_id ? parseInt(lesson_id, 10) : null;
      if (user_message) {
        await pool.query(
          `INSERT INTO lesson_chat_messages (lesson_id, user_id, role, content, created_at, updated_at)
           VALUES (?, ?, 'user', ?, NOW(), NOW())`,
          [lid, req.user.id, user_message]
        );
      }
      await pool.query(
        `INSERT INTO lesson_chat_messages (lesson_id, user_id, role, content, created_at, updated_at)
         VALUES (?, ?, 'model', ?, NOW(), NOW())`,
        [lid, req.user.id, reply]
      );
    } catch (dbErr) {
      console.error('Could not save chat message to DB:', dbErr);
    }

    res.json({ reply, usedModel });
  } catch (err) {
    console.error('AI chat endpoint error:', err);
    res.status(500).json({ error: err?.message || 'Failed to communicate with AI Tutor.' });
  }
});

// 2. Fetch Homepage Private Tutor Chat History
router.get('/history', requireAuth, async (req, res) => {
  try {
    const [messages] = await pool.query(
      'SELECT id, role, content, audio_url, created_at FROM lesson_chat_messages WHERE user_id = ? AND lesson_id IS NULL ORDER BY created_at ASC',
      [req.user.id]
    );
    res.json(messages);
  } catch (err) {
    console.error('Fetch private chat history error:', err);
    res.status(500).json({ error: 'Failed to fetch chat history.' });
  }
});

// 3. Clear Homepage Private Tutor Chat History
router.delete('/history', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM lesson_chat_messages WHERE user_id = ? AND lesson_id IS NULL', [req.user.id]);
    res.json({ success: true, message: 'Private chat history cleared.' });
  } catch (err) {
    console.error('Clear private chat history error:', err);
    res.status(500).json({ error: 'Failed to clear chat history.' });
  }
});

export default router;
