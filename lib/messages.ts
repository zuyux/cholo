import type { Locale } from './i18n';

const en = {
  seo: {
    title: 'BBOX — Open App Store for Verified Software',
    description: 'Discover, evaluate, and fund verified open-source Bitcoin apps, privacy tools, safe AI projects, and sovereign software.',
    keywords: ['open-source apps', 'Bitcoin apps', 'verified software', 'sovereign software', 'public goods funding'],
  },
  common: { learn: 'Learn', build: 'Build', privacy: 'Privacy', terms: 'Terms', subscribe: 'Subscribe', sending: 'Sending', profile: 'Profile' },
  nav: { primary: 'Primary navigation', home: 'BBOX home', search: 'Search apps', searchPlaceholder: 'SEARCH APPS...', openSearch: 'Open search' },
  footer: { tagline: 'Our Open App Store' },
  accessibility: { skip: 'Skip to main content', main: 'Main content' },
  home: {
    badge: 'HUMANS SANDBOX', title: 'BBOX is the open App Store for everyone',
    lead: 'Discover useful apps, compare trusted details, and support projects openly instead of relying on hidden gatekeepers.',
    exploreApps: 'Explore Apps', applyFunding: 'Apply for funding', protocol: 'App Registry Protocol', listedApps: 'listed apps', categories: 'categories', anchored: 'Bitcoin anchored', publicGoods: 'public goods',
    loading: 'Loading apps from the public app database...', what: 'What BBOX does', whatTitle: 'Discovery, coordination, and funding in one place.',
    whatLead: 'BBOX maps high-integrity open-source software with app profiles, reviews, grants, and milestone accountability anchored by the Bitcoin App Registry.',
    ecosystemPillars: [
      { label: 'Universal registry', detail: 'Publisher-controlled metadata for open-source apps across Bitcoin, other chains, and independent off-chain software.' },
      { label: 'App profiles', detail: 'Readable listings with media, reviews, source links, and the details users need before trying something new.' },
      { label: 'Funding layer', detail: 'Milestones and funding context make grants, research, and public-goods support easier to inspect before money moves.' },
      { label: 'Open-source commons', detail: 'A neutral surface where users, contributors, communities, and DAOs can coordinate around high-integrity software.' },
    ],
    map: 'Explore the map', browseCategory: 'Browse by Category', categoriesLabel: 'Open-source app categories', apps: 'apps',
    featured: 'Featured Apps', featuredLead: 'Top-rated apps grouped by category for quick discovery.', browseAll: 'Browse all apps', topCategoryApps: 'Top {category} apps', top: 'Top', exploreMore: 'Explore more', submitted: 'Submitted Projects', contributors: 'Contributors',
    faqBadge: 'Helpful answers', faqTitle: 'Frequently asked questions', faqLead: "Everything you need to know about BBOX. Can't find your answer? Start with the docs or explore the app registry.",
    faqItems: [
      { question: 'Is BBOX free to use?', answer: 'Yes. Browsing apps, reading profiles, and exploring public metadata are free. Funding and app-specific services may involve separate payment flows set by each project.' },
      { question: 'What kinds of apps are listed on BBOX?', answer: 'BBOX focuses on open-source Bitcoin apps, privacy tools, safe AI projects, wallets, infrastructure, developer tools, and other high-integrity software in the sovereign technology ecosystem.' },
      { question: 'How are app profiles verified?', answer: 'Profiles surface source links, publisher details, metadata, reviews, and public project context so users can inspect a project before installing, funding, or recommending it.' },
      { question: 'Can I submit my own app?', answer: 'Yes. Builders can submit apps for review, add project metadata, and keep their profile useful for users, funders, and contributors.' },
      { question: 'How does funding work?', answer: 'BBOX is designed to make funding context easier to understand through public project details, milestones, and delivery signals before support moves to a project.' },
      { question: 'Do I need a wallet to browse?', answer: 'No wallet is required to explore listed apps. A wallet or account connection is only needed for actions tied to identity, publishing, funding, or account-specific features.' },
      { question: 'Who is BBOX for?', answer: 'BBOX is for users looking for trustworthy software, builders publishing open-source projects, funders supporting public goods, and communities coordinating around useful tools.' },
      { question: 'Where can I learn more about the protocol?', answer: 'The documentation explains the Bitcoin App Registry, app metadata, submissions, funding context, and how builders can participate in the open app ecosystem.' },
    ],
    ctaEyebrow: 'Explore the sovereign software commons', ctaTitle: 'Find and support verified open-source software.', ctaLead: 'Use BBOX to move from scattered links to readable app profiles: metadata, source code, milestones, reviews, and funding context together.'
  }
};

const es: typeof en = {
  seo: {
    title: 'BBOX — Tienda abierta de software verificado',
    description: 'Descubre, evalúa y financia aplicaciones Bitcoin de código abierto, herramientas de privacidad, proyectos de IA segura y software soberano.',
    keywords: ['aplicaciones de código abierto', 'aplicaciones Bitcoin', 'software verificado', 'software soberano', 'financiamiento de bienes públicos'],
  },
  common: { learn: 'Aprender', build: 'Crear', privacy: 'Privacidad', terms: 'Términos', subscribe: 'Suscribirse', sending: 'Enviando', profile: 'Perfil' },
  nav: { primary: 'Navegación principal', home: 'Inicio de BBOX', search: 'Buscar aplicaciones', searchPlaceholder: 'BUSCAR APLICACIONES...', openSearch: 'Abrir búsqueda' },
  footer: { tagline: 'Nuestra tienda de aplicaciones' }, accessibility: { skip: 'Ir al contenido principal', main: 'Contenido principal' },
  home: {
    badge: 'ESPACIO PARA TERRÍCOLAS', title: 'APPS DE CÓDIGO ABIERTO PARA TODOS', lead: 'Descubre aplicaciones útiles, compara información confiable y apoya proyectos abiertamente, sin depender de intermediarios bboomers.',
    exploreApps: 'Explorar aplicaciones', applyFunding: 'Solicitar financiamiento', protocol: 'Protocolo de registro de aplicaciones', listedApps: 'aplicaciones registradas', categories: 'categorías', anchored: 'Anclado en Bitcoin', publicGoods: 'bienes públicos', loading: 'Cargando aplicaciones desde la base de datos pública...',
    what: 'Qué hace BBOX', whatTitle: 'Descubrimiento, coordinación y financiamiento en un solo lugar.', whatLead: 'BBOX organiza software de código abierto de alta integridad con perfiles, reseñas, subvenciones e hitos verificables anclados por el Bitcoin App Registry.',
    ecosystemPillars: [
      { label: 'Registro universal', detail: 'Metadatos controlados por los editores para aplicaciones de código abierto en Bitcoin, otras cadenas y software independiente fuera de la cadena.' },
      { label: 'Perfiles de aplicaciones', detail: 'Fichas claras con contenido multimedia, reseñas, enlaces al código fuente y la información necesaria antes de probar algo nuevo.' },
      { label: 'Capa de financiamiento', detail: 'Los hitos y el contexto de financiamiento facilitan evaluar subvenciones, investigación y apoyo a bienes públicos antes de transferir fondos.' },
      { label: 'Bienes comunes de código abierto', detail: 'Un espacio neutral donde usuarios, colaboradores, comunidades y DAO pueden coordinarse en torno a software de alta integridad.' },
    ],
    map: 'Explora el mapa', browseCategory: 'Explorar por categoría', categoriesLabel: 'Categorías de aplicaciones de código abierto', apps: 'aplicaciones', featured: 'Aplicaciones destacadas', featuredLead: 'Aplicaciones mejor valoradas por categoría para descubrirlas rápidamente.', browseAll: 'Ver todas', topCategoryApps: 'Mejores aplicaciones de {category}', top: 'Mejores', exploreMore: 'Explorar más', submitted: 'Proyectos enviados', contributors: 'Colaboradores',
    faqBadge: 'Respuestas útiles', faqTitle: 'Preguntas frecuentes', faqLead: 'Todo lo que necesitas saber sobre BBOX. ¿No encuentras tu respuesta? Consulta la documentación o explora el registro.',
    faqItems: [
      { question: '¿BBOX es gratis?', answer: 'Sí. Explorar aplicaciones, leer perfiles y consultar metadatos públicos es gratis. El financiamiento y los servicios específicos de cada aplicación pueden incluir pagos definidos por cada proyecto.' },
      { question: '¿Qué tipos de aplicaciones aparecen en BBOX?', answer: 'BBOX se centra en aplicaciones Bitcoin de código abierto, herramientas de privacidad, proyectos de IA segura, billeteras, infraestructura, herramientas para desarrolladores y otro software confiable del ecosistema de tecnología soberana.' },
      { question: '¿Cómo se verifican los perfiles de las aplicaciones?', answer: 'Los perfiles muestran enlaces al código fuente, datos del editor, metadatos, reseñas y contexto público para que los usuarios puedan evaluar un proyecto antes de instalarlo, financiarlo o recomendarlo.' },
      { question: '¿Puedo enviar mi propia aplicación?', answer: 'Sí. Los creadores pueden enviar aplicaciones para revisión, agregar metadatos del proyecto y mantener un perfil útil para usuarios, financiadores y colaboradores.' },
      { question: '¿Cómo funciona el financiamiento?', answer: 'BBOX facilita la comprensión del financiamiento mediante detalles públicos del proyecto, hitos y señales de entrega antes de que el apoyo llegue al proyecto.' },
      { question: '¿Necesito una billetera para explorar?', answer: 'No necesitas una billetera para explorar las aplicaciones. Solo se requiere una billetera o cuenta para acciones relacionadas con identidad, publicación, financiamiento o funciones personales.' },
      { question: '¿Para quién es BBOX?', answer: 'BBOX es para usuarios que buscan software confiable, creadores que publican proyectos de código abierto, financiadores de bienes públicos y comunidades que coordinan herramientas útiles.' },
      { question: '¿Dónde puedo aprender más sobre el protocolo?', answer: 'La documentación explica el Bitcoin App Registry, los metadatos, los envíos, el contexto de financiamiento y cómo pueden participar los creadores.' },
    ],
    ctaEyebrow: 'Explora el ecosistema de software soberano', ctaTitle: 'Encuentra y apoya software de código abierto verificado.', ctaLead: 'Pasa de enlaces dispersos a perfiles claros con metadatos, código fuente, hitos, reseñas y contexto de financiamiento.'
  }
};

const pt: typeof en = {
  seo: {
    title: 'BBOX — Loja aberta de software verificado',
    description: 'Descubra, avalie e financie aplicativos Bitcoin de código aberto, ferramentas de privacidade, projetos de IA segura e software soberano.',
    keywords: ['aplicativos de código aberto', 'aplicativos Bitcoin', 'software verificado', 'software soberano', 'financiamento de bens públicos'],
  },
  common: { learn: 'Aprender', build: 'Criar', privacy: 'Privacidade', terms: 'Termos', subscribe: 'Assinar', sending: 'Enviando', profile: 'Perfil' },
  nav: { primary: 'Navegação principal', home: 'Início da BBOX', search: 'Buscar aplicativos', searchPlaceholder: 'BUSCAR APLICATIVOS...', openSearch: 'Abrir busca' },
  footer: { tagline: 'Nossa loja aberta de aplicativos' }, accessibility: { skip: 'Ir para o conteúdo principal', main: 'Conteúdo principal' },
  home: {
    badge: 'ESPAÇO PARA HUMANOS', title: 'BBOX é a loja aberta de aplicativos para todos', lead: 'Descubra aplicativos úteis, compare informações confiáveis e apoie projetos abertamente, sem depender de intermediários ocultos.',
    exploreApps: 'Explorar aplicativos', applyFunding: 'Solicitar financiamento', protocol: 'Protocolo de registro de aplicativos', listedApps: 'aplicativos listados', categories: 'categorias', anchored: 'Ancorado no Bitcoin', publicGoods: 'bens públicos', loading: 'Carregando aplicativos do banco de dados público...',
    what: 'O que a BBOX faz', whatTitle: 'Descoberta, coordenação e financiamento em um só lugar.', whatLead: 'A BBOX organiza software de código aberto de alta integridade com perfis, avaliações, subsídios e marcos verificáveis ancorados pelo Bitcoin App Registry.',
    ecosystemPillars: [
      { label: 'Registro universal', detail: 'Metadados controlados pelos editores para aplicativos de código aberto no Bitcoin, em outras redes e em software independente fora da blockchain.' },
      { label: 'Perfis de aplicativos', detail: 'Listagens claras com mídia, avaliações, links para o código-fonte e os detalhes necessários antes de experimentar algo novo.' },
      { label: 'Camada de financiamento', detail: 'Marcos e contexto de financiamento facilitam a análise de subsídios, pesquisas e apoio a bens públicos antes da transferência de recursos.' },
      { label: 'Bens comuns de código aberto', detail: 'Um espaço neutro onde usuários, colaboradores, comunidades e DAOs podem se coordenar em torno de software de alta integridade.' },
    ],
    map: 'Explore o mapa', browseCategory: 'Explorar por categoria', categoriesLabel: 'Categorias de aplicativos de código aberto', apps: 'aplicativos', featured: 'Aplicativos em destaque', featuredLead: 'Aplicativos mais bem avaliados por categoria para descoberta rápida.', browseAll: 'Ver todos', topCategoryApps: 'Melhores aplicativos de {category}', top: 'Melhores', exploreMore: 'Explorar mais', submitted: 'Projetos enviados', contributors: 'Colaboradores',
    faqBadge: 'Respostas úteis', faqTitle: 'Perguntas frequentes', faqLead: 'Tudo o que você precisa saber sobre a BBOX. Não encontrou sua resposta? Consulte a documentação ou explore o registro.',
    faqItems: [
      { question: 'A BBOX é gratuita?', answer: 'Sim. Explorar aplicativos, ler perfis e consultar metadados públicos é gratuito. O financiamento e os serviços específicos de cada aplicativo podem envolver pagamentos definidos por cada projeto.' },
      { question: 'Que tipos de aplicativos aparecem na BBOX?', answer: 'A BBOX se concentra em aplicativos Bitcoin de código aberto, ferramentas de privacidade, projetos de IA segura, carteiras, infraestrutura, ferramentas para desenvolvedores e outros softwares confiáveis do ecossistema de tecnologia soberana.' },
      { question: 'Como os perfis dos aplicativos são verificados?', answer: 'Os perfis apresentam links para o código-fonte, dados do editor, metadados, avaliações e contexto público para que os usuários possam analisar um projeto antes de instalar, financiar ou recomendar.' },
      { question: 'Posso enviar meu próprio aplicativo?', answer: 'Sim. Os criadores podem enviar aplicativos para análise, adicionar metadados do projeto e manter um perfil útil para usuários, financiadores e colaboradores.' },
      { question: 'Como funciona o financiamento?', answer: 'A BBOX facilita a compreensão do financiamento por meio de detalhes públicos do projeto, marcos e sinais de entrega antes que o apoio seja destinado ao projeto.' },
      { question: 'Preciso de uma carteira para explorar?', answer: 'Nenhuma carteira é necessária para explorar os aplicativos. Uma carteira ou conta só é exigida para ações ligadas à identidade, publicação, financiamento ou recursos pessoais.' },
      { question: 'Para quem é a BBOX?', answer: 'A BBOX é para usuários que procuram software confiável, criadores que publicam projetos de código aberto, financiadores de bens públicos e comunidades que coordenam ferramentas úteis.' },
      { question: 'Onde posso saber mais sobre o protocolo?', answer: 'A documentação explica o Bitcoin App Registry, os metadados, os envios, o contexto de financiamento e como os criadores podem participar.' },
    ],
    ctaEyebrow: 'Explore o ecossistema de software soberano', ctaTitle: 'Encontre e apoie software de código aberto verificado.', ctaLead: 'Passe de links dispersos para perfis claros com metadados, código-fonte, marcos, avaliações e contexto de financiamento.'
  }
};

export type Messages = typeof en;
export const messages: Record<Locale, Messages> = { en, es, pt };
