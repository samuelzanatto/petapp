# PetApp

PetApp é um aplicativo móvel projetado para ajudar os usuários a encontrar e reportar pets perdidos, além de permitir a interação entre amantes de animais. O aplicativo oferece uma interface amigável e recursos úteis para gerenciar informações sobre pets e se conectar com outros usuários.

## Estrutura do Projeto

O projeto é organizado da seguinte forma:

```
PetApp
├── mobile
│   ├── app
│   │   ├── (tabs)                # Contém as telas principais do aplicativo
│   │   ├── auth                  # Contém telas de autenticação
│   │   ├── onboarding             # Contém telas de onboarding
│   │   ├── pet                   # Contém telas relacionadas a pets
│   │   ├── camera                # Contém telas para captura de imagens
│   │   ├── chat                  # Contém telas de chat
│   │   ├── settings               # Contém telas de configurações
│   │   ├── _layout.tsx           # Layout raiz do aplicativo
│   │   └── +not-found.tsx        # Tela de erro para rotas não encontradas
│   ├── components                 # Contém componentes reutilizáveis
│   ├── contexts                   # Contém contextos para gerenciar estado
│   ├── hooks                      # Contém hooks personalizados
│   ├── services                   # Contém serviços para chamadas de API e armazenamento
│   ├── constants                  # Contém constantes do aplicativo
│   ├── utils                      # Contém funções utilitárias
│   └── assets                     # Contém recursos como imagens e fontes
└── README.md                     # Documentação do projeto
```

## Funcionalidades

- **Tela Inicial**: Exibe posts de usuários e permite interações como curtir e comentar.
- **Exploração**: Permite que os usuários explorem novos conteúdos e pets.
- **Reportar Pet Perdido**: Usuários podem reportar pets perdidos, selecionando um pet e enviando sua localização atual.
- **Notificações**: Exibe notificações relevantes para o usuário.
- **Perfil do Usuário**: Exibe informações sobre o usuário, incluindo seus pets e posts.
- **Autenticação**: Permite que usuários façam login, registro e recuperação de senha.
- **Onboarding**: Processo de onboarding para novos usuários, coletando informações iniciais.

## Tecnologias Utilizadas

- **React Native**: Para desenvolvimento do aplicativo móvel.
- **Expo**: Para facilitar o desenvolvimento e a construção do aplicativo.
- **React Navigation**: Para gerenciamento de navegação entre telas.
- **Context API**: Para gerenciamento de estado global.
- **Fetch API**: Para chamadas de API.

## Próximos Passos

1. Implementar os arquivos que ainda não foram criados, conforme descrito na estrutura do projeto.
2. Focar na implementação do backend posteriormente, utilizando `fetch` para chamadas de API.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou pull requests.