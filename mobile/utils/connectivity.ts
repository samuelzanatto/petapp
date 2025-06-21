/**
 * Funções utilitárias para verificar conectividade com o servidor
 */
import { api } from '@/services/api';

/**
 * Verifica se o servidor está acessível
 * @param {number} timeoutMs - Tempo máximo de espera em milissegundos
 * @returns {Promise<boolean>} - true se o servidor estiver acessível, false caso contrário
 */
export async function checkServerConnectivity(timeoutMs: number = 3000): Promise<boolean> {
  try {
    // Usar Promise.race para implementar um timeout manualmente (compatível com React Native)
    const timeoutPromise = new Promise<Response>((_, reject) => {
      setTimeout(() => reject(new Error('Timeout ao tentar conectar')), timeoutMs);
    });
    
    const fetchPromise = fetch(`${api.BASE_URL}/health`, { method: 'GET' });
    
    // Esperar pela primeira promise a resolver/rejeitar
    const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
    
    // Verificar se a resposta foi bem-sucedida
    return response.ok;
  } catch (error) {
    console.warn('Erro ao verificar conectividade:', error);
    return false;
  }
}

/**
 * Aguarda até que o servidor esteja acessível ou atinja o número máximo de tentativas
 * @param {number} maxAttempts - Número máximo de tentativas
 * @param {number} intervalMs - Intervalo entre tentativas em milissegundos
 * @param {number} timeoutMs - Tempo máximo de espera por tentativa em milissegundos
 * @returns {Promise<boolean>} - true se conseguiu conectar, false se atingiu o número máximo de tentativas
 */
export async function waitForServerConnectivity(
  maxAttempts: number = 5,
  intervalMs: number = 1000,
  timeoutMs: number = 3000
): Promise<boolean> {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`Tentativa ${attempts}/${maxAttempts} de conectar ao servidor...`);
    
    const isConnected = await checkServerConnectivity(timeoutMs);
    
    if (isConnected) {
      console.log('Servidor acessível!');
      return true;
    }
    
    if (attempts < maxAttempts) {
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
  
  console.warn(`Não foi possível conectar ao servidor após ${maxAttempts} tentativas`);
  return false;
}

/**
 * Executa uma função somente se o servidor estiver acessível
 * @param {Function} fn - Função a ser executada se o servidor estiver acessível
 * @param {any} fallback - Valor a ser retornado se o servidor não estiver acessível
 * @param {number} timeoutMs - Tempo máximo de espera em milissegundos
 * @returns {Promise<any>} - O resultado da função ou o fallback
 */
export async function withConnectivityCheck<T>(
  fn: () => Promise<T>,
  fallback: T,
  timeoutMs: number = 3000
): Promise<T> {
  const isConnected = await checkServerConnectivity(timeoutMs);
  
  if (isConnected) {
    return await fn();
  } else {
    return fallback;
  }
}
