# Estrutura Televendas

Esta pasta foi organizada para separar telas principais de componentes auxiliares.

## Pastas

- `tabs/`: telas principais renderizadas pela página de Televendas.
- `overlays/`: modais, diálogos e componentes auxiliares de suporte às tabs.

## Exportações

- Use `@/components/televendas/tabs` para importar tabs.
- Use `@/components/televendas/overlays` para importar modais/diálogos.

## Regra prática

Ao criar novas telas principais, adicione em `tabs/`.
Ao criar modais e diálogos reutilizáveis, adicione em `overlays/`.
