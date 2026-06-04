import Anthropic from '@anthropic-ai/sdk';
import { Redis } from '@upstash/redis';

const anthropic = new Anthropic();
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

function parseEmailBody(body) {
  // Cloudmailin JSON format: { headers: { Subject }, envelope: { from }, plain, reply_plain }
  // Postmark format:         { Subject, From, TextBody, StrippedTextReply }
  return {
    subject: body.headers?.Subject ?? body.headers?.subject
          ?? body.Subject ?? body.subject ?? '',
    from:    body.envelope?.from ?? body.headers?.From ?? body.headers?.from
          ?? body.From ?? '',
    text:    body.reply_plain ?? body.plain
          ?? body.StrippedTextReply ?? body.TextBody ?? '',
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.query.secret !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { subject, from, text } = parseEmailBody(req.body ?? {});

  let data = {};
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Parse this forwarded email and extract article info for a personal reading library.

Subject: ${subject}
From: ${from}
Body:
${text.slice(0, 4000)}

Return ONLY a JSON object, no other text:
{
  "url": "primary article URL or null",
  "title": "article title",
  "author": "author name or null",
  "source": "publication name (e.g. The Atlantic, Nature, Substack) or null",
  "summary": "2–3 sentence summary based on context in the email",
  "topics": ["1–3 broad labels: Psychology, Culture, Technology, Science, Philosophy, Politics, Art, Economics, History, etc."]
}`,
      }],
    });

    const match = (response.content[0]?.text ?? '').match(/\{[\s\S]*\}/);
    if (match) data = JSON.parse(match[0]);
  } catch (err) {
    console.error('Claude error:', err.message);
  }

  const article = {
    id: `art_${Date.now()}`,
    url: data.url ?? '',
    title: data.title ?? subject ?? 'Untitled',
    author: data.author ?? null,
    source: data.source ?? null,
    date_saved: new Date().toISOString().split('T')[0],
    date_read: null,
    status: 'unread',
    summary: data.summary ?? null,
    notes: '',
    topics: Array.isArray(data.topics) ? data.topics : [],
    tagged_for: [],
  };

  await redis.lpush('library:articles', article);
  return res.status(200).json({ ok: true, id: article.id });
}
