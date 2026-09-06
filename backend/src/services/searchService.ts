import { getElasticsearchClient, EMAIL_INDEX, isElasticsearchAvailable } from '../config/elasticsearch.js';
import { prisma } from '../config/prisma.js';
import { logger, logEvent } from '../utils/logger.js';

export interface EmailDocument {
  emailId: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: Date | string;
  sentAt?: Date | string | null;
  createdAt: Date | string;
}

export const searchService = {
  /**
   * Indexes or updates an email document in Elasticsearch
   */
  async indexEmail(doc: EmailDocument): Promise<void> {
    const client = getElasticsearchClient();
    if (!client) return;

    try {
      await client.index({
        index: EMAIL_INDEX,
        id: doc.emailId,
        document: {
          emailId: doc.emailId,
          userId: doc.userId,
          senderId: doc.senderId,
          recipient: doc.recipient,
          subject: doc.subject,
          body: doc.body,
          status: doc.status,
          scheduledAt: new Date(doc.scheduledAt).toISOString(),
          sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
          createdAt: new Date(doc.createdAt).toISOString(),
        },
      });

      logEvent.elasticsearchIndexed({ emailId: doc.emailId, status: doc.status });
    } catch (error) {
      logger.warn({ error, emailId: doc.emailId }, 'Elasticsearch index operation failed (non-fatal)');
    }
  },

  /**
   * Searches emails by query string across recipient, subject, body, and status.
   * If Elasticsearch is unavailable, transparently falls back to PostgreSQL ILIKE/contains query.
   */
  async searchEmails(userId: string, query: string, status?: string) {
    const client = getElasticsearchClient();

    if (client && isElasticsearchAvailable()) {
      try {
        const mustClauses: any[] = [
          { term: { userId } },
        ];

        if (status) {
          mustClauses.push({ term: { status: status.toUpperCase() } });
        }

        if (query && query.trim()) {
          mustClauses.push({
            multi_match: {
              query: query.trim(),
              fields: ['recipient^3', 'subject^2', 'body', 'status'],
              fuzziness: 'AUTO',
            },
          });
        }

        const response = await client.search({
          index: EMAIL_INDEX,
          query: {
            bool: {
              must: mustClauses,
            },
          },
          sort: [{ createdAt: { order: 'desc' } }],
          size: 50,
        });

        const hits = response.hits.hits.map((hit: any) => ({
          ...hit._source,
          id: hit._source.emailId,
        }));

        return {
          source: 'elasticsearch',
          total: typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || 0,
          results: hits,
        };
      } catch (error) {
        logger.warn({ error }, 'Elasticsearch query failed, falling back to PostgreSQL');
      }
    }

    // Resilient fallback: Query PostgreSQL directly
    const trimmed = query ? query.trim() : '';
    const emails = await prisma.email.findMany({
      where: {
        userId,
        ...(status ? { status: status.toUpperCase() as any } : {}),
        ...(trimmed
          ? {
              OR: [
                { recipient: { contains: trimmed, mode: 'insensitive' } },
                { subject: { contains: trimmed, mode: 'insensitive' } },
                { body: { contains: trimmed, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        sender: {
          select: { email: true, displayName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      source: 'postgresql_fallback',
      total: emails.length,
      results: emails,
    };
  },
};
