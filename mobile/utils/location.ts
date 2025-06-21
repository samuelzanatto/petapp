/**
 * Calcula a distância entre dois pontos geográficos usando a fórmula de Haversine
 * @param lat1 Latitude do primeiro ponto em graus
 * @param lon1 Longitude do primeiro ponto em graus
 * @param lat2 Latitude do segundo ponto em graus
 * @param lon2 Longitude do segundo ponto em graus
 * @returns Distância em quilômetros
 */
export const calculateDistance = (
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number => {
  // Raio da Terra em quilômetros
  const R = 6371;
  
  // Converter graus para radianos
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  // Fórmula de Haversine
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distância em quilômetros
  
  return distance;
};

/**
 * Converte graus para radianos
 * @param deg Ângulo em graus
 * @returns Ângulo em radianos
 */
const deg2rad = (deg: number): number => {
  return deg * (Math.PI/180);
};

/**
 * Obtém bairros próximos a uma coordenada específica
 * Em um aplicativo real, esta função faria uma chamada a uma API como Google Places
 * @param latitude Latitude em graus
 * @param longitude Longitude em graus
 * @param radius Raio de busca em quilômetros (padrão: 5km)
 * @returns Array de bairros ordenados por proximidade
 */
export const getNearbyNeighborhoods = async (
  latitude: number,
  longitude: number,
  radius: number = 5
) => {
  // Implementação real utilizaria uma API como Google Places
  // Esta é uma implementação simulada para demonstração
  
  // Simular variações de coordenadas para criar bairros próximos
  // 0.01 grau ≈ 1.11 km no equador
  const mockNeighborhoods = [
    { name: 'Centro', latitude: latitude + 0.01, longitude: longitude + 0.01 },
    { name: 'Jardim América', latitude: latitude - 0.01, longitude: longitude - 0.01 },
    { name: 'Santa Efigênia', latitude: latitude + 0.02, longitude: longitude - 0.01 },
    { name: 'Floresta', latitude: latitude - 0.02, longitude: longitude + 0.01 },
    { name: 'Funcionários', latitude: latitude + 0.015, longitude: longitude + 0.02 },
    { name: 'Savassi', latitude: latitude - 0.018, longitude: longitude - 0.02 },
    { name: 'Lourdes', latitude: latitude + 0.025, longitude: longitude - 0.015 },
    { name: 'Santo Antônio', latitude: latitude - 0.022, longitude: longitude + 0.018 }
  ];
  
  // Calcular a distância de cada bairro e ordenar por proximidade
  const neighborhoods = mockNeighborhoods
    .map(neighborhood => ({
      ...neighborhood,
      distance: calculateDistance(
        latitude, 
        longitude, 
        neighborhood.latitude, 
        neighborhood.longitude
      )
    }))
    .filter(neighborhood => neighborhood.distance <= radius)
    .sort((a, b) => a.distance - b.distance);
  
  return neighborhoods;
};

/**
 * Função para verificar se um endereço está dentro de uma região
 * @param address O endereço a verificar
 * @param region A região para comparar (cidade, estado, etc)
 * @returns Verdadeiro se o endereço estiver na região
 */
export const isAddressInRegion = (address: string, region: string): boolean => {
  return address.toLowerCase().includes(region.toLowerCase());
};