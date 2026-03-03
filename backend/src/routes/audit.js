const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const router = express.Router();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to backend/.env' });
    }

    const userMessage = `Here's the data from the brand I need you to audit:\n\n${dataSummary}\n\nBefore you write the full audit, ask me 3-5 targeted follow-up questions about things the data can't show — like their margins, goals, offer structure, or target audience. Make the questions feel like they're coming from a smart media buyer who's already looked at the numbers, not a generic survey.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    res.json({
      message: response.content[0].text,
      conversationHistory: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: response.content[0].text },
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured. Add it to backend/.env' });
    }

    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    let userContent = message;
    if (generateReport) {
      userContent = message + '\n\nNow generate the full written audit report based on everything we\'ve discussed. Structure it with:\n1. Executive Summary\n2. Top 3 Profit Leaks (ranked by impact)\n3. Specific Action Plan for each leak\n4. Quick Wins (fixable in 48 hours)\n5. Longer-Term Recommendations\n\nMake it specific, actionable, and worth reading. Use markdown formatting.';
      newHistory[newHistory.length - 1].content = userContent;
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: generateReport ? 4096 : 1024,
      system: SYSTEM_PROMPT,
      messages: newHistory,
    });

    const assistantMessage = response.content[0].text;
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
