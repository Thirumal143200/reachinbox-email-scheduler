import { Client } from '@elastic/elasticsearch';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let esClient: Client | null = null;
let esAvailable = false;

export function getElasticsearchClient(): Client | null {
  if (esClient) return esClient;

  try {
    // Build client options — use API key auth when configured (Elastic Cloud / production),
    // fall back to unauthenticated for local Docker development.
    const clientOptions: ConstructorParameters<typeof Client>[0] = {
      node: config.elasticsearch.url,
      maxRetries: 3,
      requestTimeout: 5000,
    };

    if (config.elasticsearch.apiKey) {
      clientOptions.auth = { apiKey: config.elasticsearch.apiKey };
    }

    esClient = new Client(clientOptions);
    return esClient;
  } catch (error) {
    logger.warn({ error }, 'Could not initialize Elasticsearch client');
    return null;
  }
}

export const EMAIL_INDEX = 'emails';

export async function initElasticsearchIndex() {
  const client = getElasticsearchClient();
  if (!client) return;

  try {
    const ping = await client.ping();
    if (!ping) {
      logger.warn('Elasticsearch is not reachable. Search will gracefully fallback or return empty results.');
      esAvailable = false;
      return;
    }

    esAvailable = true;
    logger.info('Elasticsearch connected successfully');

    const indexExists = await client.indices.exists({ index: EMAIL_INDEX });
    if (!indexExists) {
      await client.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              emailId: { type: 'keyword' },
              userId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
      logger.info(`Elasticsearch index '${EMAIL_INDEX}' created`);
    }
  } catch (error) {
    esAvailable = false;
    logger.warn({ error }, 'Elasticsearch index initialization failed. Search operations will degrade gracefully.');
  }
}

export function isElasticsearchAvailable(): boolean {
  return esAvailable;
}