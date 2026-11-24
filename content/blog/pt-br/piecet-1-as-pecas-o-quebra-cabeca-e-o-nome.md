---
title: "piecet #1: as peças, o quebra-cabeça e o nome"
description: "Como nasceu o piecet: a dor de gravar ideias e nunca mais achar, um quebra-cabeça como metáfora da vida e um nome que precisou encaixar."
date: "2026-11-24"
tags: ["piecet", "ios", "produto", "design", "ia"]
draft: false
translationKey: "piecet-1"
kicker: "série piecet, parte 1"
accent: "#8b5cf6"
cover: "/images/blog/piecet-1/04-nasce-o-piet.webp"
---

Eu gravo áudio de tudo. Uma ideia no meio do dia, uma possibilidade que aparece do nada, um "e se a gente fizesse assim?". Gravar nunca foi o problema. O problema era [encontrar depois](scribble:underline).

Esse é o primeiro post de uma série sobre o [piecet](brand:piecet), o app que eu venho construindo nas últimas semanas e que está prestes a ser lançado. Aqui eu conto de onde veio a ideia, por que tudo nele é uma peça de quebra-cabeça e como ele ganhou esse nome. E com as imagens do processo, do primeiro rascunho até a marca final.

## A dor

Minhas ideias viviam espalhadas: áudios soltos, notas sem título, prints que eu nunca mais abria. Tudo guardado, quase nada encontrável. Eu não precisava de mais um lugar para anotar. Precisava de um lugar que [juntasse as coisas](scribble:double) por mim.

A faísca veio do [Pool](brand:pool), um app de screenshots. Ele captura primeiro e organiza depois. Eu fiquei pensando: e se isso valesse para tudo? Texto, áudio, foto, vídeo. Você joga ali e o app se vira para entender o que se relaciona com o quê.

## O primeiro passo foi apostar

Antes de qualquer linha de código, eu fiz duas coisas. Assinei o [Claude](brand:claude) Ultra, o plano de 20x, para ter fôlego de construir de verdade. E entrei no [Apple Developer Program](brand:apple-developer), para conseguir testar no meu próprio iPhone sem ficar buildando a cada mudança.

O primeiro commit entrou no repositório no dia 7 de novembro, [à 0h49](note:). Ele tinha só a especificação do produto e as regras do projeto. Nenhuma linha de código ainda. Até o dia 24, foram 773 commits e cerca de 197 pull requests.

## Antes do app, o nome

A primeira coisa que eu criei não foi uma tela. Foi o nome.

Eu queria uma analogia que tivesse uma parte menor e uma parte maior: cada coisa que você guarda, e o aglomerado que se forma quando elas se relacionam, com as imagens, as pessoas, os lugares. Pesquisando, cheguei em _pieces_, as peças de um quebra-cabeça. Só que o domínio já estava tomado.

Aí eu fui olhar uma das marcas que mais me inspiram pelo jeito como foi criada: a [Vivet](brand:vivet), do Kai Cenat. E juntei duas palavras. _Piece_ com _it_. [piece it](scribble:circle). Encaixar. Daí veio o **piecet**.

> Em alguns momentos é difícil encaixar uma peça. Mas, quando ela encaixa, a imagem fica bonita.

É a analogia que eu levo para a vida, e virou o conceito do app. Comprei o domínio e fui desenhar o ícone.

## Tudo é uma peça

No piecet, tudo que você guarda é uma peça: um texto, um áudio, uma foto, um vídeo. Quando várias peças falam da mesma pessoa, da mesma viagem ou do mesmo plano, o app encaixa as peças num quebra-cabeça, sozinho. Um quebra-cabeça começa com duas peças, e cada nova peça completa um pouco mais a imagem.

A metáfora tinha que estar na interface, não só no nome. Então até o encaixe foi desenhado com cuidado: uma cabeça redonda num pescoço estreito, como num quebra-cabeça de verdade.

![O encaixe das peças do tabuleiro antes e depois do ajuste: cabeça maior e pescoço mais estreito](/images/blog/piecet-1/07b-encaixe-das-pecas.webp "o encaixe, antes e depois. 9 de novembro.")

## O Piet

Para mim, o app precisava de um mascote. Alguém que fosse a presença da marca, como o Pumpy é para o [FitFolio](brand:fitfolio), e como os mascotes de outros produtos de IA que eu ando acompanhando. Então eu criei uma peça de quebra-cabeça com rosto.

Os primeiros rascunhos saíram do [ChatGPT](brand:chatgpt). Ainda azul, ainda sem o rosto certo. Ele começou como Pip e depois virou **Piet**.

![Três rascunhos do mascote: uma peça azul sorrindo, a mesma peça com olhos grandes e uma grade de variações de rosto em várias cores](/images/blog/piecet-1/02-primeiros-rascunhos-do-mascote.webp "os primeiros rascunhos, antes de achar o rosto.")

Tem um detalhe engraçado: a especificação que eu escrevi naquela madrugada dizia, com todas as letras, _no blob mascots_. Nada de mascote. Na mesma tarde, o Piet nasceu.

![O Piet roxo em quatro formatos: peça solta, ícone quadrado e duas versões menores](/images/blog/piecet-1/04-nasce-o-piet.webp "7 de novembro, à tarde: nasce o Piet.") ![A marca final do piecet: o ícone redondo com o rosto do Piet e o logotipo, no claro e no escuro](/images/blog/piecet-1/16-marca-final.webp "e a marca final, 23 de novembro.")

## Das primeiras telas ao Piet no centro

As primeiras telas resolviam o básico: adicionar uma peça, gravar, encontrar. O primeiro build no simulador saiu na manhã do dia 7, num visual que eu chamei de _Instrument_: laranja queimado, sem mascote nenhum.

Quando o Piet apareceu, ficou claro que o app inteiro tinha que girar em volta dele. Na mesma noite, eu redesenhei tudo: roxo, quebra-cabeças de verdade na interface e uma primeira tela que diz [Hi, I'm Piet.](scribble:underline)

![O primeiro build no simulador, com o visual Instrument em laranja e sem mascote](/images/blog/piecet-1/03-primeiro-build.webp "manhã: o primeiro build, ainda sem o Piet.") ![Catorze telas do redesign em volta do Piet: boas-vindas, captura, gravação, quebra-cabeças, busca e ajustes](/images/blog/piecet-1/05-redesign-com-o-piet.webp "noite: o redesign inteiro em volta dele.")

## Gosto também se treina

Se tem uma coisa que esse processo me ensinou, é que [taste](scribble:circle) faz toda a diferença: o gosto por UI e UX, e ter boas referências na mão. E o [X](brand:x) virou uma fonte fundamental para isso. O Explorar coloca na sua frente o trabalho de designers do mundo inteiro, todo dia.

Na madrugada do dia 7, antes de qualquer código, eu peguei as 585 imagens que eu tinha curtido no X e estudei telas a partir delas. Saíram três direções: _Ledger_, _Print_ e _Instrument_.

![Estudo de telas feito a partir das imagens curtidas no X, com várias telas de iPhone lado a lado](/images/blog/piecet-1/01-estudo-de-telas.webp "a madrugada do dia 7: telas a partir dos meus likes no X.")

Daí em diante, foi refinar. Usei o Claude para pesquisar e para iterar protótipos, com as skills do [Emil Kowalski](brand:emil-kowalski) guiando cada animação, até a interface ter a cara de quebra-cabeça que eu queria.

## Tudo no seu iPhone

Eu queria tudo que me fazia falta no mesmo app: criar os quebra-cabeças automaticamente, guardar texto, áudio, fotos e vídeos, e buscar tudo isso [no próprio aparelho](scribble:underline), sem gastar com IA remota.

Estar no ecossistema da Apple ajuda muito nisso. E, além dos modelos da Apple, eu fiz a curadoria de alguns modelos open source para rodar ali mesmo, no iPhone. Sem conta, sem servidor: suas peças ficam no seu aparelho e no seu iCloud.

> [!note] O que vem nos próximos posts
> O piecet está quase saindo do forno, e a série continua:
>
> - como eu construí o app inteiro com o Claude, um pull request por vez;
> - os testes;
> - como foi subir o app na App Store;
> - e o marketing do lançamento.

Se quiser acompanhar, assine o [feed RSS](/pt-br/personal/blog/rss.xml) ou me chame no [LinkedIn](https://www.linkedin.com/in/davi16lacerda/). A próxima peça já está a caminho.
