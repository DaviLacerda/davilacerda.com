---
title: "Olá, mundo"
description: "Por que estou começando a escrever sobre engenharia de IA: notas de quem constrói produtos com LLMs, o que pretendo abordar e como este site foi feito."
date: "2026-10-24"
tags: ["engenharia-de-ia", "llms", "escrita"]
draft: false
translationKey: "hello-world"
---

O primeiro programa de toda pessoa que programa imprime "Olá, mundo". Pareceu justo começar a escrever do mesmo jeito.

Sou o Davi, Engenheiro de IA na Algar, em Uberlândia. Passo boa parte dos meus dias transformando modelos de linguagem em software que as pessoas realmente usam, o que é bem diferente de fazer uma demo funcionar uma vez. No caminho, fui juntando anotações: o que funcionou, o que quebrou de formas surpreendentes e os padrões que uso de novo e de novo. Este blog é onde essas anotações vão morar.

## Por que escrever

Escrever obriga a ter clareza. Se eu não consigo explicar por que um pipeline de recuperação devolve o trecho errado, provavelmente ainda não entendi o problema.

A engenharia de IA também anda rápido, e muito do que se publica fica em um de dois extremos: o hype do dia do lançamento ou artigos científicos densos. Quero escrever do meio do caminho, como alguém que coloca funcionalidades com LLMs no ar e precisa mantê-las funcionando na segunda-feira de manhã.

## O que esperar

- **Construindo com LLMs**: prompts, chamadas de ferramentas, saídas estruturadas e como deixar tudo confiável.
- **Recuperação (RAG)**: chunking, embeddings, busca e quando recuperação é a resposta errada.
- **Agentes**: quando um loop de agente compensa a complexidade e quando uma função simples é melhor.
- **Avaliação**: como saber se uma mudança realmente melhorou as coisas.
- **Produto e front-end**: interfaces que fazem funcionalidades de IA parecerem confiáveis.

## Um exemplo pequeno

Muito código útil com LLMs é só uma função bem tipada em volta de uma chamada ao modelo. A parte interessante é o que acontece _depois_ que o modelo responde:

```ts title="summarize.ts" {8-9}
import { z } from "zod";

const Summary = z.object({ title: z.string(), bullets: z.array(z.string()).max(5) });

export async function summarize(text: string) {
  const raw = await callModel({ system: "Resuma o texto em JSON.", input: text });

  // Valide antes que o resto da aplicação veja o resultado.
  return Summary.parse(JSON.parse(raw));
}
```

> Trate a saída do modelo como entrada de usuário: útil, mas não confiável até ser validada.

## Como este site foi feito

Este site é um app Next.js gerado estaticamente, escrito em inglês e português, com os posts como arquivos Markdown no repositório. Ele também publica dados estruturados para que buscadores e assistentes de IA entendam quem eu sou e sobre o que escrevo. Se você está lendo isto por meio de um motor de respostas, olá para você também.

Por enquanto é isso. Se quiser conversar sobre engenharia de IA, me mande um e-mail em [davi16lacerda@gmail.com](mailto:davi16lacerda@gmail.com) ou me encontre no [LinkedIn](https://www.linkedin.com/in/davi16lacerda/).
