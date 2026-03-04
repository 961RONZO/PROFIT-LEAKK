const express = require('express');
const OpenAI = require('openai');
const router = express.Router();

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const SYSTEM_PROMPT = `You are a senior ecommerce growth strategist and media buyer with 10+ years experience analyzing Shopify stores and Meta Ads accounts. You specialize in finding profit leaks and fixing them with precision.

Your communication style:
- Direct and confident, not generic
- You ask smart, specific questions that uncover things the data can't show
- You think like an agency owner who's seen hundreds of brands, not a chatbot
- You use concrete numbers and specifics, not vague advice
- You're focused on profit impact, not vanity metrics

When analyzing data, you look for:
1. The gap between what the numbers show and what the brand THINKS is happening
2. Structural issues (offer, funnel, retention) vs execution issues (creative, targeting)
3. Quick wins that can move the needle in 48 hours vs foundational fixes

Always format your final audit report in clean markdown with clear sections.`;

/**
 * POST /api/audit/start
 * Begin an AI audit session with data summary
 */
router.post('/start', async (req, res, next) => {
  try {
    const { dataSummary } = req.body;
    if (!dataSummary) return res.status(400).json({ error: 'dataSummary is required' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add it to backend/.env' });
    }

    const userMessage = `Here's the data from the brand I need you to audit:\n\n${dataSummary}\n\nBefore you write the full audit, ask me 3-5 targeted follow-up questions about things the data can't show — like their margins, goals, offer structure, or target audience. Make the questions feel like they're coming from a smart media buyer who's already looked at the numbers, not a generic survey.`;

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });

    const assistantMessage = response.choices[0].message.content;

    res.json({
      message: assistantMessage,
      conversationHistory: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantMessage },
      ],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/audit/message
 * Continue the audit conversation
 */
router.post('/message', async (req, res, next) => {
  try {
    const { message, conversationHistory, generateReport } = req.body;

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured. Add it to backend/.env' });
    }

    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    if (generateReport) {
      newHistory[newHistory.length - 1].content = message + '\n\nNow generate the full written audit report based on everything we\'ve discussed. Structure it with:\n1. Executive Summary\n2. Top 3 Profit Leaks (ranked by impact)\n3. Specific Action Plan for each leak\n4. Quick Wins (fixable in 48 hours)\n5. Longer-Term Recommendations\n\nMake it specific, actionable, and worth reading. Use markdown formatting.';
    }

    const response = await getClient().chat.completions.create({
      model: 'gpt-4o',
      max_tokens: generateReport ? 4096 : 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...newHistory,
      ],
    });

    const assistantMessage = response.choices[0].message.content;
    const updatedHistory = [...newHistory, { role: 'assistant', content: assistantMessage }];

    res.json({
      message: assistantMessage,
      conversationHistory: updatedHistory,
      isReport: generateReport || false,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
