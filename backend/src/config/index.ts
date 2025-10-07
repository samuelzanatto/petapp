import * as os from 'os';

// Configurações da aplicação
class Config {
  // URL base da API
  private _apiUrl: string;
  // Configurações do Firebase
  private _firebase: {
    serverKey: string;
    projectId: string;
  };
  // Configurações do Supabase
  private _supabase: {
    url: string;
    anonKey: string;
  };
  
  constructor() {
    // Usar variável de ambiente, ou calcular baseado no IP local
    this._apiUrl = process.env.API_URL || this.getLocalApiUrl();
    // Inicializar configurações do Firebase
    this._firebase = {
      serverKey: process.env.FIREBASE_SERVER_KEY || '',
      projectId: process.env.FIREBASE_PROJECT_ID || 'petapp-9e317',
    };
    // Inicializar configurações do Supabase
    this._supabase = {
      url: process.env.SUPABASE_URL || '',
      anonKey: process.env.SUPABASE_ANON_KEY || '',
    };
    
    console.log(`Inicializando API com URL base: ${this._apiUrl}`);
  }
  
  // Obter URL da API usando o IP local
  private getLocalApiUrl(): string {
    // Obter interfaces de rede disponíveis
    const interfaces = os.networkInterfaces();
    let ipAddress = '127.0.0.1'; // Padrão para localhost
    
    // Iterar sobre todas as interfaces de rede
    Object.keys(interfaces).forEach((interfaceName) => {
      const networkInterface = interfaces[interfaceName];
      if (networkInterface) {
        // Filtrar por interfaces IPv4 que não sejam localhost e não sejam internos
        networkInterface.forEach((info) => {
          if (info.family === 'IPv4' && !info.internal && info.address.startsWith('192.168.')) {
            ipAddress = info.address;
          }
        });
      }
    });
    
    // Porta padrão do servidor
    const port = process.env.PORT || 3000;
    
    return `http://${ipAddress}:${port}`;
  }
  
  // Getter para a URL da API
  get apiUrl(): string {
    return this._apiUrl;
  }
  
  // URL base sem o caminho da API
  get baseUrl(): string {
    return this._apiUrl;
  }

  // Getter para as configurações do Firebase
  get firebase(): any {
    return this._firebase;
  }

  // Getter para as configurações do Supabase
  get supabase(): any {
    return this._supabase;
  }
}

// Exportar uma instância única de configuração (singleton)
export const config = new Config();