import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private prisma: PrismaService) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  async summarizeTeam(teamId: string): Promise<{ summary: string; generatedAt: string }> {
    // 1. Fetch all team members and their current statuses
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: { user: true },
        },
        channels: {
          include: {
            messages: {
              include: { sender: true },
              orderBy: { createdAt: 'desc' },
              take: 50, // Last 50 messages per channel
            },
          },
        },
      },
    });

    if (!team) {
      throw new Error(`Team with ID ${teamId} not found`);
    }

    // 2. Build the context string for the AI
    const memberStatuses = team.members
      .map(m => `• ${m.user.name} — Status: "${m.user.status}" (Role: ${m.role}, Timezone: ${m.user.timezone})`)
      .join('\n');

    const channelSummaries = team.channels
      .map(channel => {
        const msgs = channel.messages
          .reverse() // chronological order
          .map(msg => `  [${msg.createdAt.toISOString().slice(11, 16)}] ${msg.sender.name}: ${msg.content}`)
          .join('\n');
        return `Channel #${channel.name} (${channel.messages.length} recent messages):\n${msgs || '  (no messages)'}`;
      })
      .join('\n\n');

    const prompt = `You are an AI assistant for SyncPoint OS, a remote-first Team Operating System.

Analyze the following team data and produce a concise, actionable summary for a Team Lead.

## Team: ${team.name}
${team.description ? `Description: ${team.description}` : ''}

## Current Member Statuses
${memberStatuses || '(No members)'}

## Recent Channel Activity
${channelSummaries || '(No channels)'}

---

Please provide:
1. **Team Pulse** — A one-sentence overall health/mood of the team based on statuses.
2. **Key Activity** — A bullet-pointed summary of the most important topics discussed across channels.
3. **Action Items** — Any tasks, blockers, or follow-ups you can identify from the conversations.
4. **Availability** — Who is online/available and who appears to be away or offline.

Keep the summary concise (under 300 words). Use a professional but friendly tone.`;

    // 3. Call Gemini API
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
      });

      const summary = response.text || 'Unable to generate summary.';

      return {
        summary,
        generatedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Gemini API error:', error.message);
      return {
        summary: `⚠️ AI summarization failed: ${error.message}. Please check your GEMINI_API_KEY.`,
        generatedAt: new Date().toISOString(),
      };
    }
  }

  async transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: [
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType: mimeType,
            }
          },
          { text: "Please transcribe the audio from this video. Return only the transcription text, nothing else." }
        ],
      });
      return response.text || '';
    } catch (error: any) {
      console.error('Transcription failed:', error.message);
      return '';
    }
  }
}
