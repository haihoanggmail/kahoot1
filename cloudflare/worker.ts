/**
 * Cloudflare Worker Entry Router for HACHIHI Quiz MVP
 * Section 5 Specification: REST Endpoints + Durable Object WebSocket Gateway
 */

import { LiveRoomDurableObject, Env } from './LiveRoomDurableObject.ts';

export { LiveRoomDurableObject };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. WebSocket Upgrade Gateway for Live Room Sessions
    // Route: /ws?pin=XXXXXX
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/sessions/')) {
      if (request.headers.get('Upgrade') === 'websocket') {
        const pin = url.searchParams.get('pin') || url.pathname.split('/')[3];
        if (!pin) {
          return new Response('Thiếu mã PIN phòng thi', { status: 400 });
        }

        // Get or Create Durable Object by PIN
        const id = env.LIVE_ROOMS.idFromName(pin);
        const stub = env.LIVE_ROOMS.get(id);

        return stub.fetch(request);
      }
    }

    // 2. REST API: Quizzes Management
    if (url.pathname === '/api/quizzes' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM quizzes WHERE status = "published" ORDER BY created_at DESC'
      ).all();
      return Response.json(results);
    }

    // 3. REST API: Create Live Game Session
    if (url.pathname === '/api/sessions' && request.method === 'POST') {
      const body: any = await request.json();
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const sessionId = `ses-${Date.now()}-${pin}`;

      // Insert to D1
      await env.DB.prepare(
        'INSERT INTO game_sessions (id, quiz_id, host_id, pin, status, current_question_index) VALUES (?, ?, ?, ?, "lobby", 0)'
      ).bind(sessionId, body.quizId, body.hostId || 'host', pin).run();

      // Initialize Durable Object
      const doId = env.LIVE_ROOMS.idFromName(pin);
      const stub = env.LIVE_ROOMS.get(doId);
      await stub.fetch(new Request('http://internal/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, quiz: body.quiz }),
      }));

      return Response.json({
        sessionId,
        pin,
        hostToken: `tok-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        maxCapacity: 50,
      });
    }

    // 4. REST API: Check Session Status
    if (url.pathname.startsWith('/api/sessions/') && request.method === 'GET') {
      const pin = url.pathname.split('/')[3];
      const session: any = await env.DB.prepare(
        'SELECT * FROM game_sessions WHERE pin = ? OR id = ?'
      ).bind(pin, pin).first();

      if (!session) {
        return Response.json({ error: 'Phòng không tồn tại' }, { status: 404 });
      }

      const { count }: any = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM participants WHERE session_id = ?'
      ).bind(session.id).first();

      return Response.json({
        session,
        participantsCount: count || 0,
        maxCapacity: 50,
      });
    }

    return new Response('HACHIHI Quiz Cloudflare Worker API is running.', { status: 200 });
  },
};
