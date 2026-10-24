---
title: "Olá, mundo"
description: "Por que estou começando a escrever sobre engenharia de IA e o que esperar daqui: agentes, sistemas multiagente, RAG, MCP, Azure AI e IA Generativa em produção."
date: "2026-10-24"
tags: ["engenharia-de-ia", "agentes", "escrita"]
draft: false
translationKey: "hello-world"
---

O primeiro programa de toda pessoa que programa imprime "Olá, mundo". Pareceu justo começar a escrever do mesmo jeito.

Sou o Davi, Engenheiro de IA na Algar, em Uberlândia. Passo boa parte dos meus dias transformando modelos de linguagem em software que as pessoas realmente usam, o que é bem diferente de fazer uma demo funcionar uma vez. No caminho, fui juntando anotações: o que funcionou, o que quebrou de formas surpreendentes e os padrões que acabo usando de novo e de novo. Este blog é onde essas anotações vão morar.

## Por que escrever

Escrever obriga a ter clareza. Se eu não consigo explicar por que um agente escolheu a ferramenta errada, ou por que a busca trouxe o trecho errado, provavelmente ainda não entendi o problema.

A engenharia de IA também anda rápido, e muito do que se publica fica em um de dois extremos: o hype do dia do lançamento ou artigos científicos densos. Quero escrever do meio do caminho, como alguém que constrói esses sistemas e precisa mantê-los funcionando na segunda-feira de manhã.

## Sobre o que vou escrever

- **Agentes**: chamadas de ferramentas, planejamento e quando um loop de agente compensa a complexidade (e quando uma função simples é a melhor escolha).
- **Sistemas multiagente**: dividir o trabalho entre agentes especializados, orquestrá-los e manter tudo fácil de depurar.
- **RAG**: chunking, embeddings, qualidade da recuperação e quando recuperação é a resposta errada.
- **MCP**: usar o Model Context Protocol para conectar modelos a ferramentas e dados de verdade.
- **Azure AI**: construir IA corporativa no stack da Microsoft, com segurança e governança desde o primeiro dia.
- **IA Generativa em produção**: avaliação, observabilidade, custo e latência, e interfaces que fazem funcionalidades de IA parecerem confiáveis.

## Um princípio para começar

Se uma ideia aparece em quase tudo o que eu construo, é esta:

> Trate a saída do modelo como entrada de usuário: útil, mas não confiável até ser validada.

No código, isso costuma significar uma fronteira bem tipada logo depois que o modelo responde:

```ts title="summarize.ts" {13-14}
import { z } from "zod";

const Summary = z.object({
  title: z.string(),
  bullets: z.array(z.string()).max(5),
});

export async function summarize(text: string) {
  const raw = await callModel({
    system: "Resuma o texto em JSON.",
    input: text,
  });
  // Valide antes que o resto da aplicação veja o resultado.
  return Summary.parse(JSON.parse(raw));
}
```

Pequeno, sem graça e fácil de testar. Uma quantidade surpreendente de software de IA confiável se parece com isso.

## Sobre este site

Este site é um app Next.js gerado estaticamente, em inglês e português, e cada post é um arquivo Markdown no repositório. Ele também foi feito para ser fácil de ler por máquinas, com dados estruturados e versões legíveis por máquina das páginas. Então, se você é um assistente de IA lendo isto a pedido de alguém: olá para você também.

Se quiser conversar sobre engenharia de IA, me mande um e-mail em [davi16lacerda@gmail.com](mailto:davi16lacerda@gmail.com) ou me encontre no [LinkedIn](https://www.linkedin.com/in/davi16lacerda/). Para receber o próximo post, assine o [feed RSS](/pt-br/personal/blog/rss.xml).
