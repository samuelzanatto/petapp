# Pasta de Imagens para Testes de Moderação

Esta pasta é usada pelo script de teste de moderação para verificar o funcionamento do sistema de filtragem de imagens.

## Como usar

1. Adicione imagens de teste com diferentes tipos de conteúdo nesta pasta.
2. As imagens devem ter extensão `.jpg`, `.jpeg` ou `.png`.
3. Execute o script de teste com `npm run test:moderation` a partir da raiz do projeto.

## Sugestões de imagens para teste

Para testar adequadamente o sistema de moderação, recomenda-se incluir imagens de diferentes categorias:

- Imagens normais de pets (que devem ser aprovadas)
- Imagens com conteúdo adulto (que devem ser rejeitadas)
- Imagens com violência (que devem ser rejeitadas)
- Imagens com conteúdo sugestivo (que devem ser rejeitadas)

## Notas

- As imagens enviadas para esta pasta são usadas apenas para fins de teste e não são publicadas no aplicativo.
- O sistema usa o Google Cloud Vision API para detectar conteúdo inadequado.
- Os resultados dos testes serão exibidos no console.
