# Script para preparar e fazer deploy da aplicação Docker no Windows
# Autor: PetApp Team
# Data: 26 de maio de 2025

# Definir cores para output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    
    $originalColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $originalColor
}

Write-ColorOutput "Preparando o PetApp Backend para deploy em Docker" "Yellow"

# Verificar se as credenciais existem
if (-not (Test-Path -Path "./credentials")) {
    Write-ColorOutput "Diretório de credenciais não encontrado!" "Red"
    Write-Output "Criando diretório de credenciais..."
    New-Item -Path "./credentials" -ItemType Directory -Force
    Write-ColorOutput "ATENÇÃO: Você precisa adicionar seus arquivos de credenciais em ./credentials antes de continuar." "Yellow"
    Write-Output "- firebase-service-account.json"
    Write-Output "- google-cloud-vision.json (se aplicável)"
    exit 1
}

# Verificar se o arquivo .env.production existe
if (-not (Test-Path -Path "./.env.production")) {
    Write-ColorOutput "Arquivo .env.production não encontrado!" "Red"
    Write-Output "Por favor, crie o arquivo .env.production com as configurações de produção."
    exit 1
}

# Compilar a imagem Docker
Write-ColorOutput "Compilando a imagem Docker..." "Green"
docker build -t petapp-backend:latest .

# Criar arquivo de tag com data
$Date = Get-Date -Format "yyyyMMddHHmm"
Set-Content -Path "./latest-tag.txt" -Value "petapp-backend:$Date"

# Atualizar tag com data
Write-ColorOutput "Adicionando tag com data: petapp-backend:$Date" "Green"
docker tag petapp-backend:latest petapp-backend:$Date

Write-ColorOutput "Imagem Docker criada com sucesso!" "Green"
Write-ColorOutput "Tag da imagem: petapp-backend:$Date" "Yellow"
Write-Output ""
Write-ColorOutput "Para enviar a imagem para um registro Docker:" "Yellow"
Write-Output "1. Faça login no seu registro (exemplo com Docker Hub):"
Write-Output "   docker login"
Write-Output ""
Write-Output "2. Tague a imagem com seu usuário/registro:"
Write-Output "   docker tag petapp-backend:$Date seu-usuario/petapp-backend:$Date"
Write-Output "   docker tag petapp-backend:$Date seu-usuario/petapp-backend:latest"
Write-Output ""
Write-Output "3. Envie a imagem para o registro:"
Write-Output "   docker push seu-usuario/petapp-backend:$Date"
Write-Output "   docker push seu-usuario/petapp-backend:latest"
Write-Output ""
Write-ColorOutput "Para executar localmente com docker-compose:" "Yellow"
Write-Output "   Copy-Item .env.production .env -Force"
Write-Output "   docker-compose up -d"
Write-Output ""
Write-ColorOutput "Processo concluído!" "Green"
