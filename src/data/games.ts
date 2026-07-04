export interface Game {
  id: string;
  title: string;
  system: "n64" | "psx";
  genre: string;
  year: number;
  rating: string;
  description: string;
  synopsis: string;
  romUrl?: string;
  coverGradient: string;
  isPlayableImmediately: boolean;
  controls: string[];
  cheats: string[];
}

export const GAMES_CATALOG: Game[] = [
  {
    id: "flappybird64",
    title: "Flappy Bird 64",
    system: "n64",
    genre: "Arcade / Habilidade",
    year: 2018,
    rating: "9.2",
    description: "Um port homebrew sensacional do clássico Flappy Bird rodando perfeitamente em hardware real de Nintendo 64.",
    synopsis: "Flappy Bird 64 é um clone moderno desenvolvido pela comunidade retro-gaming (TheFlyingZamboni). Ele desafia você a controlar um pequeno pássaro pixelado através de uma série de obstáculos verdes em 3D usando o controle de N64. É um excelente exemplo de como o microcódigo e a arquitetura MIPS podem ser otimizados para jogos casuais e fluidos.",
    romUrl: "https://raw.githubusercontent.com/theflyingzamboni/N64-Homebrew/master/FlappyBird64.z64",
    coverGradient: "from-amber-500 via-orange-600 to-red-700",
    isPlayableImmediately: true,
    controls: ["Analógico ou WASD: Mover", "Botão A ou Barra de Espaço: Voar / Subir", "Botão Start ou Enter: Pausar / Iniciar"],
    cheats: [
      "Modo Invisível (Desafio Extremo): Pressione C-Cima, C-Baixo, Esquerda, Direita no menu inicial.",
      "Cores Alternativas: Pressione R ou L para mudar a cor do pássaro na tela de início."
    ]
  },
  {
    id: "spacedemo3d",
    title: "Space Demo 3D",
    system: "n64",
    genre: "Simulador Espacial",
    year: 2017,
    rating: "8.9",
    description: "Uma demo técnica belíssima simulando voo espacial 3D em tempo real com mapeamento de textura e iluminação.",
    synopsis: "Desenvolvida por SnailDev, a Space Demo 3D é uma demonstração de hardware que destaca os limites do SGI Reality Coprocessor (RDP/RSP). Com uma nave espacial renderizada em tempo real contra uma galáxia de partículas, a demo demonstra o cálculo de matrizes de projeção 3D e renderização de polígonos texturizados que tornaram o Nintendo 64 uma lenda dos gráficos poligonais.",
    romUrl: "https://raw.githubusercontent.com/SnailDev/n64-homebrew/master/Space%20Demo/SpaceDemo.z64",
    coverGradient: "from-blue-600 via-indigo-800 to-purple-950",
    isPlayableImmediately: true,
    controls: ["Analógico ou WASD: Navegar no espaço", "Gatilho Z ou Barra de Espaço: Propulsão", "Botões C ou Q/E: Rolar a câmera", "Botão B ou Shift: Alternar visualização da malha (Wireframe)"],
    cheats: [
      "Modo Hipervelocidade: Segure Z e pressione C-Direita três vezes seguidas durante o voo.",
      "Gravidade Zero Extrema: Pressione L + R simultaneamente para flutuar sem controle."
    ]
  },
  {
    id: "diagnostic64",
    title: "Diagnostic Test ROM",
    system: "n64",
    genre: "Utilitário / Teste",
    year: 2019,
    rating: "8.5",
    description: "A ROM de diagnóstico definitiva para testar botões, áudio, cor de vídeo e integridade da memória RDRAM.",
    synopsis: "Desenvolvida por Sanni, esta ROM de diagnóstico de código aberto é usada por engenheiros e entusiastas de preservação de hardware em todo o mundo. Ela oferece uma interface gráfica minimalista em 2D que testa com precisão a recepção dos botões de controle, o áudio estereofônico, os limites da interface de vídeo (VI) e valida se o Expansion Pak (8MB RDRAM) está operando sem erros.",
    romUrl: "https://raw.githubusercontent.com/sanni/cartreader/master/roms/test.z64",
    coverGradient: "from-slate-700 via-slate-800 to-zinc-900",
    isPlayableImmediately: true,
    controls: ["Direcional Digital ou Setas: Mover no menu", "Botão A ou Barra de Espaço: Confirmar teste", "Botão B ou Esc: Voltar / Cancelar"],
    cheats: [
      "Teste de Tela Oculta: Segure os botões L e R e pressione C-Esquerda.",
      "Modo de Áudio Estéreo Oculto: Pressione C-Baixo, C-Baixo, C-Cima no teste de som."
    ]
  },
  {
    id: "mario64",
    title: "Super Mario 64",
    system: "n64",
    genre: "Plataforma 3D",
    year: 1996,
    rating: "9.9",
    description: "A obra-prima pioneira do 3D. Salve a Princesa Peach explorando os quadros mágicos do castelo.",
    synopsis: "Super Mario 64 é um marco histórico do entretenimento interativo. Lançado como título de lançamento do Nintendo 64, estabeleceu as regras de movimentação 3D, controle de câmera analógico e design de fases livres. Dirigido por Shigeru Miyamoto, o jogo desafia os jogadores a coletarem 120 Estrelas de Poder espalhadas por mundos conectados por quadros dentro do castelo da Princesa Peach.",
    coverGradient: "from-sky-400 via-blue-500 to-red-600",
    isPlayableImmediately: false,
    controls: ["Analógico ou WASD: Mover Mario", "Botão A ou Barra de Espaço: Pular", "Botão B ou J/K: Soco / Ação", "Direcional C ou I/J/K/L: Controlar a câmera", "Botão Z ou Shift: Agachar / Rastejar"],
    cheats: [
      "Jogar como Luigi: Boato clássico desmentido na época, mas agora possível em patches! (Pressione Start no controle 2).",
      "Vidas Infinitas (99): No topo do castelo de Peach, fale com Yoshi após coletar 120 estrelas.",
      "Salto Triplo Sem Dano: Yoshi também te concederá um salto triplo especial que anula dano de queda!"
    ]
  },
  {
    id: "zeldaoot",
    title: "The Legend of Zelda: Ocarina of Time",
    system: "n64",
    genre: "Ação / Aventura / RPG",
    year: 1998,
    rating: "10",
    description: "O jogo mais aclamado de todos os tempos. Viaje através das eras para deter Ganondorf.",
    synopsis: "Ocarina of Time é frequentemente coroado como o ápice do design de jogos. Apresentando o revolucionário sistema de mira 'Z-Targeting' e contextos musicais mágicos através da Ocarina, o jogo conta a jornada de Link de garoto da floresta a Herói do Tempo, viajando 7 anos no futuro para impedir que o terrível vilão Ganondorf domine a sagrada Triforce e amaldiçoe o reino de Hyrule.",
    coverGradient: "from-emerald-600 via-teal-800 to-amber-600",
    isPlayableImmediately: false,
    controls: ["Analógico ou WASD: Mover Link", "Gatilho Z ou Shift: Travar mira (Z-Targeting)", "Botão A ou Barra de Espaço: Ação contextual / Rolar", "Botão B ou J: Cortar com a espada", "Botões C ou Q/E/R: Usar itens atribuídos", "Botão Start: Menu de inventário"],
    cheats: [
      "Fada da Garrafa Infinita: Solte uma fada perto de uma fofoca de pedra e toque a canção de Zelda.",
      "Canto dos Espantalhos: Fale com Bono e Pierre no Lago Hylia na infância para criar sua própria música de teletransporte.",
      "Vaca na Casa de Link: Complete a corrida de cavalos no Rancho Lon Lon em menos de 50 segundos."
    ]
  },
  {
    id: "mariokart64",
    title: "Mario Kart 64",
    system: "n64",
    genre: "Corrida / Party",
    year: 1996,
    rating: "9.5",
    description: "Corridas de kart multiplayer frenéticas. Arremesse cascos, desvie de bananas e vença o campeonato.",
    synopsis: "Mario Kart 64 trouxe a franquia clássica de corrida de karts para a terceira dimensão. Com suporte inédito a 4 jogadores e pistas icônicas como Royal Raceway, Toad's Turnpike e Rainbow Road, o jogo popularizou a mecânica de drifts com mini-turbos e o uso estratégico de itens caóticos como a Estrela de Invencibilidade, o Casco Azul e o Raio Encolhedor.",
    coverGradient: "from-pink-500 via-purple-600 to-indigo-900",
    isPlayableImmediately: false,
    controls: ["Analógico ou WASD: Dirigir Kart", "Botão A ou Barra de Espaço: Acelerar", "Botão B ou J: Frear / Dar ré", "Gatilho Z ou Shift: Usar item", "Botão R ou L: Pular / Fazer drift"],
    cheats: [
      "Tela de Título Especial: Complete todas as copas de 150cc em primeiro lugar para habilitar a tela de início no estilo Luigi's Raceway.",
      "Modo Espelhado (Extra): Vença todas as copas no modo Extra (150cc invertido) para habilitar a versão espelhada das pistas.",
      "Atalho na Pista Rainbow Road: Logo no início da corrida, salte para a esquerda no grande declive para cortar metade da pista!"
    ]
  },
  {
    id: "starfox64",
    title: "Star Fox 64",
    system: "n64",
    genre: "Shoot 'em Up / Rail Shooter",
    year: 1997,
    rating: "9.4",
    description: "Comande a equipe Star Fox no caça Arwing e defenda o sistema Lylat das garras de Andross.",
    synopsis: "Star Fox 64 (conhecido na Europa como Lylat Wars) é o auge do combate aéreo arcade de 64 bits. Foi o primeiro jogo a utilizar o acessório Rumble Pak, que transmitia vibrações físicas ao controle. Liderando Fox McCloud, Falco Lombardi, Peppy Hare e Slippy Toad em caças de combate Arwing, tanques Landmaster e submarinos Blue Marine, os jogadores enfrentam exércitos interestelares com dublagens completas inesquecíveis.",
    coverGradient: "from-violet-900 via-indigo-950 to-emerald-800",
    isPlayableImmediately: false,
    controls: ["Analógico ou WASD: Guiar nave Arwing", "Botão A ou Barra de Espaço: Atirar laser (segurar para carregar mira)", "Botão B ou J: Lançar bomba inteligente", "Gatilho Z/R ou Q/E: Inclinar nave para esquerda/direita", "C-Esquerda/C-Direita: Loopings acrobáticos / Manobras"],
    cheats: [
      "Jogar a pé no modo Versus: Complete o modo história com Medalha de Ouro em todas as fases do caminho difícil.",
      "Caça Arwing Melhorado: Consiga uma medalha de ouro no Setor Y para desbloquear lasers duplos permanentes na próxima missão.",
      "Óculos do Fox: Fox usará óculos de sol no menu se você vencer todas as fases do jogo!"
    ]
  },
  {
    id: "castlevaniasotn",
    title: "Castlevania: Symphony of the Night",
    system: "psx",
    genre: "Ação / Exploração / RPG",
    year: 1997,
    rating: "9.8",
    description: "O maior clássico de ação 2D do PlayStation 1. Explore o imenso castelo do Drácula como Alucard.",
    synopsis: "Castlevania: Symphony of the Night redefiniu os jogos de exploração lateral em 2D, cunhando o gênero 'Metroidvania'. Abandonando o estilo linear dos antecessores, Symphony of the Night introduziu elementos robustos de RPG (níveis, equipamentos, magias) e uma trilha sonora barroca majestosa de Michiru Yamane. Controle Alucard, o filho do Drácula, enquanto ele invade o castelo demoníaco para salvar o caçador de vampiros Richter Belmont e destruir o lorde das trevas.",
    coverGradient: "from-red-950 via-rose-900 to-black",
    isPlayableImmediately: false,
    controls: ["Setas ou WASD: Mover Alucard", "Botão X ou Barra de Espaço: Pular", "Botão Quadrado/Bolas ou J/K: Atacar com a mão esquerda/direita", "Botão Triângulo ou Shift: Recuar / Dash defensivo", "Botão R1/L1 ou Q/E: Transformar em Lobo, Morcego ou Névoa"],
    cheats: [
      "Código do Nome 'RICHTER': Digite RICHTER na tela de seleção de nome após zerar para jogar como o lendário caçador Belmont.",
      "Código do Nome 'X-X!V''Q': Digite este código no nome para começar o jogo com Alucard com a sorte extremamente alta (99 Luck) e anel especial.",
      "Castelo Invertido: Use os óculos especiais de Maria Belmont na batalha final do castelo comum e destrua o anel de Shaft para abrir o Castelo Invertido com chefes e finais secretos!"
    ]
  },
  {
    id: "crashbandicoot",
    title: "Crash Bandicoot",
    system: "psx",
    genre: "Plataforma 3D",
    year: 1996,
    rating: "9.3",
    description: "Ajude o marsupial mais carismático do PS1 a derrotar o maligno Dr. Neo Cortex.",
    synopsis: "Crash Bandicoot é um dos maiores mascotes da história do PlayStation 1, desenvolvido pela lendária Naughty Dog. Com perspectiva tridimensional inovadora em trilhos, Crash viaja pelo arquipélago fictício de Wumpa Islands, quebrando caixas de madeira, coletando Frutas Wumpa, e usando sua máscara protetora Aku Aku para salvar sua namorada Tawna das garras de experimentos genéticos de Dr. Neo Cortex.",
    coverGradient: "from-orange-500 via-red-500 to-amber-700",
    isPlayableImmediately: false,
    controls: ["Setas ou WASD: Mover Crash", "Botão X ou Barra de Espaço: Pular", "Botão Quadrado ou J: Giro de Tornado (Ataque)", "Botão Start: Pausar o jogo"],
    cheats: [
      "Super Password de 100% de Conclusão: Triângulo, Triângulo, Triângulo, Triângulo, X, Quadrado, Triângulo, Triângulo, Triângulo, Triângulo, Quadrado, X, Triângulo, Círculo, Triângulo, Triângulo, Triângulo, Triângulo, Círculo, Quadrado, X, X, X, X.",
      "Fases de Bônus Secretas: Colete as 3 fichas douradas de Neo Cortex ou Brio em fases selecionadas para desbloquear portais de bônus desafiadores."
    ]
  },
  {
    id: "metalgearsolid",
    title: "Metal Gear Solid",
    system: "psx",
    genre: "Espionagem / Stealth / Ação",
    year: 1998,
    rating: "9.8",
    description: "Infiltre-se na base de Shadow Moses como Solid Snake no clássico cinemático de Hideo Kojima.",
    synopsis: "Metal Gear Solid revolucionou a indústria ao elevar os jogos eletrônicos ao patamar do cinema. Escrito e dirigido por Hideo Kojima, o jogo foca em infiltração tática em vez de combate direto. Controle Solid Snake em sua missão de resgate de reféns e destruição do mecha nuclear 'Metal Gear REX', enfrentando vilões excêntricos com habilidades psíquicas e telemetria militar envolvente.",
    coverGradient: "from-zinc-800 via-slate-900 to-zinc-950",
    isPlayableImmediately: false,
    controls: ["Setas ou WASD: Mover Snake / Encostar na parede", "Botão X ou Barra de Espaço: Agachar / Rastejar", "Botão Círculo ou J: Soco / Enforcar inimigo", "Botão Quadrado ou K: Atirar com arma equipada", "Botão R1/L1 ou Q/E: Abrir menu de armas / itens rápidos"],
    cheats: [
      "Como derrotar Psycho Mantis: Mude a porta de controle física no emulador para o 'Port 2' para evitar que ele leia os seus movimentos!",
      "Bandana de Munição Infinita: Complete o jogo recusando-se a ceder à tortura de Ocelot para salvar Meryl no final.",
      "Camuflagem Óptica (Invisibilidade): Aceite a tortura de Ocelot para escapar com Otacon e ganhar o disfarce de invisibilidade de ficção científica."
    ]
  },
  {
    id: "residentevil2",
    title: "Resident Evil 2",
    system: "psx",
    genre: "Survival Horror",
    year: 1998,
    rating: "9.7",
    description: "Sobreviva ao apocalipse zumbi de Raccoon City com Leon Kennedy e Claire Redfield.",
    synopsis: "Resident Evil 2 é a obra máxima de terror de sobrevivência da Capcom no PlayStation. Utilizando ângulos de câmera estáticos e cenários pré-renderizados espetaculares, o jogo narra a fuga de Leon e Claire de uma delegacia sitiada por monstros gerados pelo vazamento do T-Virus da nefasta Umbrella Corporation, apresentando o incrível sistema Zapping que muda a história dependendo da ordem que você joga.",
    coverGradient: "from-red-900 via-stone-900 to-zinc-950",
    isPlayableImmediately: false,
    controls: ["Setas ou WASD: Movimentação estilo 'Tanque' (Cima anda, Lados rotacionam)", "Botão Quadrado ou Barra de Espaço: Correr", "Botão X ou J: Investigar / Atirar", "Botão R1 ou Shift: Mirar com a arma equipada", "Botão Start: Inventário"],
    cheats: [
      "Munição Infinita (Código Clássico): Entre no inventário durante a jogabilidade e pressione: Cima, Cima, Baixo, Baixo, Esquerda, Direita, Esquerda, Direita, Mira (R1).",
      "Jogar como Hunk ou Tofu: Complete os cenários A e B com notas espetaculares (Rank A) para desbloquear os minijogos de sobreviventes especiais."
    ]
  },
  {
    id: "silenthill",
    title: "Silent Hill",
    system: "psx",
    genre: "Terror Psicológico",
    year: 1999,
    rating: "9.6",
    description: "Procure sua filha Cheryl pelas ruas misteriosas e enevoadas da cidade amaldiçoada.",
    synopsis: "Diferente de Resident Evil, Silent Hill focou no terror psicológico perturbador. Usando renderização 3D completa com neblina constante e escuridão profunda guiada apenas por uma lanterna portátil de feixe dinâmico e um rádio estático que chia quando monstros estão próximos, a história de Harry Mason se tornou um ícone cult de roteiro sinistro e ambientação surreal.",
    coverGradient: "from-zinc-600 via-stone-800 to-amber-950",
    isPlayableImmediately: false,
    controls: ["Setas ou WASD: Mover Harry (estilo tanque)", "Botão X ou J: Ação / Atacar", "Botão R2 ou Shift: Mirar arma", "Botão Círculo ou L: Ligar/Desligar Lanterna", "Botão Triângulo: Abrir Mapa"],
    cheats: [
      "Arma Secreta 'Hiper Blaster' Alienígena: Consiga o 'UFO Ending' (final dos discos voadores) jogando com a pedra do talismã na primeira jogada.",
      "Ajuste de Sangue Colorido: Acesse as opções secretas segurando L1+R1+L2+R2 no menu de configurações para mudar a cor do sangue para verde ou violeta!"
    ]
  }
];
