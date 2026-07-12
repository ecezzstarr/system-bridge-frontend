import { neon } from './pg-neon';

export async function getDbConnection() {
  try {
    const result = await neon`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

export async function withDbErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const isConnected = await getDbConnection();
    if (!isConnected) {
      return {
        success: false,
        error: 'Database connection failed. Please try again.',
      };
    }
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error(`${operationName} error:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('timeout') || errorMessage.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: 'Database timeout. Please try again.',
      };
    }
    
    return {
      success: false,
      error: `${operationName} failed. Please try again.`,
    };
  }
}
