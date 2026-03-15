import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../chat.db'),
  lmStudioBaseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234',
  azure: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    deployment: process.env.AZURE_OPENAI_DEPLOYMENT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
  },
};

export function isAzureConfigured(): boolean {
  return !!(config.azure.endpoint && config.azure.apiKey && config.azure.deployment);
}
