import { GOOGLE_MAPS_API_KEY } from '@/constants/Config';
import { calculateDistance } from '@/utils/location';

// Interface para o resultado da API de lugares próximos
interface NearbySearchResult {
  results: Array<{
    name: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      }
    };
    vicinity: string;
    place_id: string;
  }>;
  status: string;
}

/**
 * Busca bairros próximos a uma localização usando a API Google Places
 */
export const getNearbyNeighborhoods = async (
  latitude: number,
  longitude: number,
  radius: number = 5000
): Promise<Array<{
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distance: number;
}>> => {
  try {
    console.log(`Buscando bairros próximos a (${latitude}, ${longitude})`);
    
    // Montar a URL da API com os parâmetros
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=neighborhood&key=${GOOGLE_MAPS_API_KEY}`;
    
    console.log('URL da requisição:', url);
    
    // Fazer a requisição
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Erro ao chamar Places API: ${response.status}`);
    }
    
    const data: NearbySearchResult = await response.json();
    console.log('Resposta da API Places:', JSON.stringify(data.status));
    
    // Verificar se a API retornou resultados
    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('Places API não retornou resultados:', data.status);
      
      // Buscar outras áreas (sublocality) como fallback
      return await getSublocalities(latitude, longitude, radius);
    }
    
    // Mapear os resultados para o formato que precisamos
    const neighborhoods = data.results.map(place => ({
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.vicinity || '',
      distance: calculateDistance(
        latitude, 
        longitude, 
        place.geometry.location.lat, 
        place.geometry.location.lng
      )
    })).sort((a, b) => a.distance - b.distance);
    
    console.log(`Encontrados ${neighborhoods.length} bairros`);
    return neighborhoods;
  } catch (error) {
    console.error('Erro ao buscar bairros:', error);
    
    // Em caso de erro, tentar outra abordagem
    return await getSublocalities(latitude, longitude, radius);
  }
};

/**
 * Busca sublocalidades como fallback quando bairros não são encontrados
 */
async function getSublocalities(latitude: number, longitude: number, radius: number) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=sublocality&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(url);
    const data: NearbySearchResult = await response.json();
    
    if (data.status !== 'OK' || !data.results) {
      console.warn('Sublocality API não retornou resultados:', data.status);
      return generateFallbackNeighborhoods(latitude, longitude);
    }
    
    return data.results.map(place => ({
      name: place.name,
      latitude: place.geometry.location.lat,
      longitude: place.geometry.location.lng,
      address: place.vicinity || '',
      distance: calculateDistance(
        latitude, 
        longitude, 
        place.geometry.location.lat, 
        place.geometry.location.lng
      )
    })).sort((a, b) => a.distance - b.distance);
  } catch (error) {
    console.error('Erro ao buscar sublocalidades:', error);
    return generateFallbackNeighborhoods(latitude, longitude);
  }
}

/**
 * Gera bairros simulados quando APIs falham
 */
function generateFallbackNeighborhoods(latitude: number, longitude: number) {
  console.log('Gerando bairros simulados como fallback');
  
  // Criar pontos em diferentes direções ao redor da localização atual
  const offsets = [
    { dx: 0.01, dy: 0.01, name: 'Centro' },
    { dx: -0.01, dy: -0.01, name: 'Jardim América' },
    { dx: 0.02, dy: -0.01, name: 'Santa Efigênia' },
    { dx: -0.02, dy: 0.01, name: 'Floresta' },
    { dx: 0.015, dy: 0.02, name: 'Funcionários' },
    { dx: -0.018, dy: -0.02, name: 'Savassi' },
    { dx: 0.025, dy: -0.015, name: 'Lourdes' },
    { dx: -0.022, dy: 0.018, name: 'Santo Antônio' }
  ];
  
  return offsets.map(offset => {
    const lat = latitude + offset.dx;
    const lng = longitude + offset.dy;
    return {
      name: offset.name,
      latitude: lat,
      longitude: lng,
      address: '',
      distance: calculateDistance(latitude, longitude, lat, lng)
    };
  }).sort((a, b) => a.distance - b.distance);
}