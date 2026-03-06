# 🚀 Instruções para Publicar no GitHub Pages

## Passo 1: Criar Repositório no GitHub

1. Acesse: https://github.com/new
2. Nome do repositório: `gran-florata-dashboard` (ou o nome que preferir)
3. Descrição: "Dashboard financeiro para condomínio residencial"
4. Deixe como **Público** (necessário para GitHub Pages gratuito)
5. **NÃO** marque: "Add a README file"
6. Clique em "Create repository"

## Passo 2: Conectar seu Repositório Local

Após criar o repositório, copie o URL (exemplo: `https://github.com/seu-usuario/gran-florata-dashboard.git`)

Execute no terminal:

```bash
cd "C:\Users\ander\Desktop\Gran Florata"
git branch -M main
git remote add origin https://github.com/andiimdevlp/gran-florata-dashboard.git
git push -u origin main
```

## Passo 3: Ativar GitHub Pages

1. Vá para o repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em "Source", selecione:
   - Branch: `main`
   - Folder: `/ (root)`
5. Clique em **Save**
6. Aguarde 1-2 minutos

## Passo 4: Acessar seu Site

Seu dashboard estará disponível em:
```
https://seu-usuario.github.io/gran-florata-dashboard/
```

---

## ✅ Arquivos Preparados

- ✅ Comentários removidos
- ✅ .gitignore configurado
- ✅ README.md atualizado
- ✅ Commit inicial criado
- ✅ Pronto para push!

## 📝 Atualizar o Site Posteriormente

Para atualizar após fazer mudanças:

```bash
cd "C:\Users\ander\Desktop\Gran Florata"
git add .
git commit -m "Descrição das mudanças"
git push
```

Aguarde 1-2 minutos e o site será atualizado automaticamente.
