const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const glob = require('glob');

// Função para encontrar o arquivo AndroidManifest.xml no diretório de build
const findAndroidManifestPath = () => {
  try {
    const pattern = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');
    const files = glob.sync(pattern, { absolute: true });
    
    if (files.length > 0) {
      return files[0];
    }
    
    console.log('AndroidManifest.xml não encontrado em:', pattern);
    return null;
  } catch (error) {
    console.error('Erro ao procurar AndroidManifest.xml:', error);
    return null;
  }
};

// Função para ler e analisar o AndroidManifest.xml
const parseManifest = (manifestPath) => {
  try {
    const xml = fs.readFileSync(manifestPath, 'utf8');
    let manifest;
    const parser = new xml2js.Parser({ explicitArray: true });
    
    parser.parseString(xml, (err, result) => {
      if (err) {
        console.error('Erro ao analisar o AndroidManifest.xml:', err);
        return;
      }
      manifest = result;
    });
    
    return manifest;
  } catch (error) {
    console.error('Erro ao ler AndroidManifest.xml:', error);
    return null;
  }
};

// Função para corrigir o conflito de meta-data
const fixManifestConflict = (manifest) => {
  if (!manifest) return null;
  
  try {
    // Adicionar namespace 'tools' se não existir
    if (!manifest.manifest.$['xmlns:tools']) {
      manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }
    
    // Encontrar a seção 'application'
    const application = manifest.manifest.application[0];
    
    // Encontrar todas as meta-data
    const metaDataArray = application['meta-data'] || [];
    
    // Verificar se existe o meta-data de cor de notificação
    let notificationColorNode = null;
    for (let i = 0; i < metaDataArray.length; i++) {
      if (metaDataArray[i].$['android:name'] === 'com.google.firebase.messaging.default_notification_color') {
        notificationColorNode = metaDataArray[i];
        break;
      }
    }
    
    // Se encontrado, adicionar o tools:replace
    if (notificationColorNode) {
      notificationColorNode.$['tools:replace'] = 'android:resource';
      console.log('Meta-data modificado com sucesso!');
    } else {
      // Se não encontrado, adicionar a meta-data
      if (!application['meta-data']) {
        application['meta-data'] = [];
      }
      
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.firebase.messaging.default_notification_color',
          'android:resource': '@color/notification_icon_color',
          'tools:replace': 'android:resource'
        }
      });
      
      console.log('Meta-data adicionado com sucesso!');
    }
    
    return manifest;
  } catch (error) {
    console.error('Erro ao modificar o AndroidManifest.xml:', error);
    return null;
  }
};

// Função para escrever o manifest modificado
const writeModifiedManifest = (manifestPath, manifest) => {
  try {
    const builder = new xml2js.Builder();
    const xml = builder.buildObject(manifest);
    
    fs.writeFileSync(manifestPath, xml, 'utf8');
    console.log('AndroidManifest.xml atualizado com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao escrever o AndroidManifest.xml:', error);
    return false;
  }
};

// Função principal para executar o script
const main = () => {
  console.log('Iniciando correção do AndroidManifest.xml...');
  
  // Instalar dependências necessárias se não estiverem instaladas
  try {
    require('xml2js');
    require('glob');
  } catch (error) {
    console.log('Instalando dependências necessárias...');
    require('child_process').execSync('npm install --save-dev xml2js glob', {
      stdio: 'inherit',
    });
  }
  
  const manifestPath = findAndroidManifestPath();
  if (!manifestPath) {
    console.error('AndroidManifest.xml não encontrado.');
    return false;
  }
  
  const manifest = parseManifest(manifestPath);
  if (!manifest) {
    return false;
  }
  
  const modifiedManifest = fixManifestConflict(manifest);
  if (!modifiedManifest) {
    return false;
  }
  
  const success = writeModifiedManifest(manifestPath, modifiedManifest);
  return success;
};

// Executar o script
main();
