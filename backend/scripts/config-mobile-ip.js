/**
 * Script para obter e exibir o endereço IP local do computador
 * para facilitar a configuração do aplicativo móvel.
 */

const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Função para obter o endereço IP local (não-loopback) da máquina
 */
function getLocalIpAddress() {
  const nets = networkInterfaces();
  const results = {};

  // Coletar todos os endereços IP não-loopback
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Pular interfaces loopback e não IPv4
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // Filtrar endereços IPv4 válidos para uso em rede local
  const validIps = Object.values(results)
    .flat()
    .filter(ip => ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'));

  return validIps;
}

/**
 * Função para verificar e exibir a configuração atual do aplicativo móvel
 */
function checkMobileConfig() {
  const configPath = path.join(__dirname, '../../mobile/constants/Config.ts');
  
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    const apiUrlMatch = configContent.match(/API_URL\s*=\s*['"]([^'"]+)['"]/);
    
    if (apiUrlMatch && apiUrlMatch[1]) {
      return apiUrlMatch[1];
    }
  } catch (error) {
    console.error('Erro ao ler arquivo de configuração do aplicativo móvel:', error.message);
  }
  
  return null;
}

/**
 * Atualiza o arquivo de configuração do aplicativo móvel com o novo IP
 */
function updateMobileConfig(ip) {
  const configPath = path.join(__dirname, '../../mobile/constants/Config.ts');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    // Substituir a URL da API
    configContent = configContent.replace(
      /(export const API_URL\s*=\s*['"])([^'"]+)(['"])/,
      `$1http://${ip}:3000/api$3`
    );
    
    fs.writeFileSync(configPath, configContent, 'utf8');
    console.log(`\n✅ Arquivo de configuração do aplicativo atualizado com sucesso.`);
  } catch (error) {
    console.error('Erro ao atualizar arquivo de configuração:', error.message);
  }
}

// Obter endereços IP válidos
const ipAddresses = getLocalIpAddress();
const currentApiUrl = checkMobileConfig();

console.log('\n📱 CONFIGURAÇÃO DO APLICATIVO MÓVEL\n');
console.log('Endereços IP disponíveis para conexão:');

if (ipAddresses.length === 0) {
  console.log('❌ Nenhum endereço IP válido encontrado.');
} else {
  ipAddresses.forEach((ip, index) => {
    console.log(`[${index + 1}] ${ip}`);
  });
  
  console.log(`\nURL da API atual: ${currentApiUrl || 'Não definida'}`);
  
  // Se houver apenas um IP disponível, oferecer atualização automática
  if (ipAddresses.length === 1) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`\nDeseja atualizar a configuração do aplicativo para usar o IP ${ipAddresses[0]}? (S/n) `, (answer) => {
      if (answer.toLowerCase() !== 'n') {
        updateMobileConfig(ipAddresses[0]);
        console.log(`\n✅ Para aplicar a mudança, reinicie o aplicativo no dispositivo móvel.`);
      }
      rl.close();
    });
  } else if (ipAddresses.length > 1) {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`\nEscolha o número do endereço IP para usar (1-${ipAddresses.length}): `, (answer) => {
      const index = parseInt(answer, 10) - 1;
      if (index >= 0 && index < ipAddresses.length) {
        updateMobileConfig(ipAddresses[index]);
        console.log(`\n✅ Para aplicar a mudança, reinicie o aplicativo no dispositivo móvel.`);
      } else {
        console.log('\n❌ Escolha inválida. Configuração não foi atualizada.');
      }
      rl.close();
    });
  }
}
