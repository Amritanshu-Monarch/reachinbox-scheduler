import { Client } from '@elastic/elasticsearch';

const esClient = new Client({ node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200' });
const INDEX_NAME = 'emails';

export const initElasticsearch = async () => {
  const exists = await esClient.indices.exists({ index: INDEX_NAME });
  if (!exists) {
    await esClient.indices.create({
      index: INDEX_NAME,
      mappings: {
        properties: {
          id: { type: 'keyword' },
          userId: { type: 'keyword' },
          senderEmail: { type: 'keyword' },
          recipient: { type: 'text' },
          subject: { type: 'text' },
          body: { type: 'text' },
          status: { type: 'keyword' },
          sentAt: { type: 'date' },
        },
      },
    });
  }
};

export const indexEmailInElasticsearch = async (emailData: Record<string, any>) => {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: emailData.id,
      document: emailData,
    });
  } catch (err) {
    console.error('Elasticsearch indexing error:', err);
  }
};

export const searchEmailsInElasticsearch = async (query: string, userId: string) => {
  const result = await esClient.search({
    index: INDEX_NAME,
    query: {
      bool: {
        must: [
          { term: { userId } },
          {
            multi_match: {
              query,
              fields: ['subject', 'body', 'recipient', 'senderEmail'],
            },
          },
        ],
      },
    },
  });
  return result.hits.hits.map((hit) => hit._source);
};
