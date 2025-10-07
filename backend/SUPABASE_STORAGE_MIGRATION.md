# Migração do Sistema de Upload para Supabase Storage

## Visão Geral

O sistema de upload do PetApp foi migrado de armazenamento local em disco para o **Supabase Storage**, oferecendo uma solução de armazenamento em nuvem escalável, segura e com CDN integrada.

## Alterações Realizadas

### 1. Infraestrutura

#### Buckets Criados
Foram criados 5 buckets públicos no Supabase Storage:

- **users**: Imagens de perfil de usuários
- **pets**: Imagens de pets
- **posts**: Imagens de posts/publicações
- **alerts**: Imagens de alertas (pets perdidos/encontrados)
- **claims**: Imagens de reivindicações de pets

#### Políticas de Acesso (RLS)
Cada bucket tem as seguintes políticas configuradas:
- ✅ **SELECT**: Público - Qualquer um pode visualizar as imagens
- ✅ **INSERT**: Autenticado - Qualquer usuário autenticado pode fazer upload
- ✅ **UPDATE**: Dono - Apenas o proprietário pode atualizar suas imagens
- ✅ **DELETE**: Dono - Apenas o proprietário pode deletar suas imagens

### 2. Configuração

#### Variáveis de Ambiente
Adicionadas no arquivo `.env`:
```env
SUPABASE_URL=https://bxjvrdispbcophioyxli.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Dependências
- Instalado `@supabase/supabase-js` para integração com o Supabase

### 3. Novos Arquivos Criados

#### `src/config/supabase.ts`
Cliente configurado do Supabase para uso no backend.

#### `src/services/supabaseStorage.ts`
Serviço completo para gerenciamento de uploads no Supabase Storage com as seguintes funcionalidades:

- **`uploadImage()`**: Upload de imagem com processamento em múltiplos tamanhos
- **`deleteImage()`**: Remoção de imagens e suas versões
- **`downloadImage()`**: Download de imagens
- **`getPublicUrl()`**: Obtenção de URL pública
- **`createSignedUrl()`**: Criação de URLs temporárias assinadas

### 4. Arquivos Modificados

#### `src/controllers/upload.controller.ts`
- ✅ Removida função `processAndSaveImage()` (substituída pelo serviço Supabase)
- ✅ Atualizado `uploadImage()` para usar Supabase Storage
- ✅ Atualizado `uploadBase64Image()` para usar Supabase Storage
- ✅ Atualizado `uploadProfileImage()` para usar Supabase Storage
- ✅ Atualizado `uploadPetImage()` para usar Supabase Storage
- ✅ Atualizado `uploadPostImage()` para usar Supabase Storage
- ✅ Atualizado `uploadAlertImage()` para usar Supabase Storage
- ✅ Removidos imports desnecessários (`fs`, `path`, `sharp`)

#### `src/config/index.ts`
- ✅ Adicionadas configurações do Supabase
- ✅ Criado getter `supabase` para acesso às credenciais

## Características do Novo Sistema

### Processamento de Imagens
O sistema mantém o processamento de imagens em múltiplos tamanhos:

- **Posts**: `full` (1080x1080), `medium` (600x600), `thumbnail` (320x320)
- **Pets**: `full` (800x800), `medium` (400x400), `thumbnail` (150x150)
- **Users**: `full` (400x400), `thumbnail` (150x150)
- **Alerts**: `full` (800x800), `medium` (400x400)
- **Claims**: `full` (800x800), `medium` (400x400)

### Moderação de Conteúdo
- ✅ Mantida integração com moderação de imagens
- ✅ Imagens são moderadas antes do upload
- ✅ Upload via base64 inclui moderação automática

### URLs Públicas
Todas as imagens agora retornam URLs públicas do Supabase:
```
https://bxjvrdispbcophioyxli.supabase.co/storage/v1/object/public/[bucket]/[filename]
```

### Performance
- ✅ **CDN Global**: Imagens servidas via CDN do Supabase
- ✅ **Cache**: Headers de cache configurados (1 hora)
- ✅ **Compressão**: Imagens otimizadas com Sharp antes do upload

## Compatibilidade

### Frontend
O frontend **não requer alterações**, pois a API mantém a mesma estrutura de resposta:

```json
{
  "success": true,
  "imageUrl": "https://...",
  "versions": {
    "full": "https://...",
    "medium": "https://...",
    "thumbnail": "https://..."
  }
}
```

### Banco de Dados
A tabela `mediaAsset` continua sendo utilizada para tracking opcional de uploads.

## Vantagens da Migração

1. **✅ Escalabilidade**: Sem limites de armazenamento local
2. **✅ Performance**: CDN global para entrega rápida de imagens
3. **✅ Segurança**: Controle de acesso via RLS (Row Level Security)
4. **✅ Disponibilidade**: Alta disponibilidade e redundância
5. **✅ Manutenção**: Sem necessidade de gerenciar armazenamento local
6. **✅ Backup**: Backup automático pelo Supabase
7. **✅ URLs Públicas**: URLs diretas e permanentes para as imagens

## Próximos Passos (Opcional)

1. **Migração de Imagens Antigas**: 
   - Criar script para migrar imagens do diretório local `/uploads` para os buckets do Supabase

2. **Limpeza**:
   - Remover diretório `/uploads` após migração completa
   - Remover configuração de servir arquivos estáticos no Express

3. **Otimizações**:
   - Implementar compressão WebP para navegadores compatíveis
   - Adicionar lazy loading de imagens no frontend

## Testando o Sistema

### Upload de Imagem
```bash
curl -X POST http://localhost:3000/api/upload/image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test.jpg"
```

### Upload de Imagem de Perfil
```bash
curl -X POST http://localhost:3000/api/upload/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@profile.jpg"
```

## Suporte

Para problemas ou dúvidas sobre o sistema de storage, consulte:
- [Documentação Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Dashboard](https://supabase.com/dashboard/project/bxjvrdispbcophioyxli/storage/buckets)

## Conclusão

A migração para o Supabase Storage foi concluída com sucesso, mantendo todas as funcionalidades existentes enquanto adiciona benefícios significativos de escalabilidade, performance e manutenção.
