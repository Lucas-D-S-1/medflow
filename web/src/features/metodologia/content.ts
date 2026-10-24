// Texto aprovado por Lucas para Fontes e indicadores.
export const sources = [
  [
    "Internações do SUS — SIH/RD",
    "Ministério da Saúde / DATASUS",
    "Internações novas, óbitos, dias de permanência e valores aprovados em hospitais de São Paulo.",
    "[Consultar no DATASUS](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/)"
  ],
  [
    "Cadastro de estabelecimentos e leitos — CNES",
    "Ministério da Saúde / DATASUS",
    "Leitos SUS declarados em cada mês e informações atuais dos estabelecimentos.",
    "[Consultar no DATASUS](https://datasus.saude.gov.br/informacoes-de-saude-tabnet/)"
  ],
  [
    "População — Censo 2022",
    "IBGE, com distribuição pelo Ministério da Saúde",
    "População dos municípios usada nas taxas por habitante.",
    "[Arquivo oficial de regiões e população](https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/dbgeral/macroregiao_de_saude_csv.zip)"
  ],
  [
    "Regiões de Saúde e mapas",
    "Ministério da Saúde e IBGE",
    "Municípios que compõem cada Região de Saúde e limites municipais da malha de 2024.",
    "[Regiões de Saúde](https://s3.sa-east-1.amazonaws.com/ckan.saude.gov.br/dbgeral/macroregiao_de_saude_csv.zip) · [Malha de São Paulo](https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2024/UFs/SP/SP_Municipios_2024.zip)"
  ],
  [
    "Inflação — IPCA",
    "IBGE / SIDRA",
    "Correção dos valores aprovados para permitir a leitura em preços da competência de referência IPCA indicada na metodologia.",
    "[Tabela oficial do IPCA](https://sidra.ibge.gov.br/tabela/1737)"
  ],
  [
    "Lista de condições sensíveis à atenção primária",
    "Ministério da Saúde",
    "Grupos de diagnósticos definidos na Portaria SAS/MS 221/2008 para o indicador de ICSAP.",
    "[Consultar a portaria](https://bvsms.saude.gov.br/bvs/saudelegis/sas/2008/prt0221_17_04_2008.html)"
  ]
]

export const periods = [
  [
    "Internações e leitos SUS",
    "Dados organizados por mês, de janeiro de 2024 até a competência indicada nos metadados."
  ],
  [
    "População usada nas taxas",
    "Censo 2022."
  ],
  [
    "Limites municipais usados no mapa",
    "Malha do IBGE de 2024."
  ],
  [
    "Valores corrigidos pela inflação",
    "Competência de referência IPCA indicada nos metadados."
  ]
]

export const indicators = [
  [
    "Internações novas",
    "Conta os registros de novas internações; continuações de longa permanência ficam separadas.",
    "Não é a contagem total de autorizações de internação."
  ],
  [
    "Permanência média",
    "Soma os dias de permanência e divide pelas internações novas.",
    "Uma permanência maior não demonstra, por si só, pior atendimento: o perfil clínico influencia o resultado."
  ],
  [
    "Mortalidade observada — TMH",
    "Divide os óbitos pelas internações novas e apresenta o resultado em porcentagem.",
    "Não ajusta a gravidade dos pacientes e não mede, sozinha, a qualidade do hospital."
  ],
  [
    "Permanência por diagnóstico — IPR",
    "Compara a permanência média do hospital para um diagnóstico com a dos demais hospitais da mesma região para esse diagnóstico.",
    "Uma diferença é um sinal para investigar; os pacientes podem ter perfis clínicos diferentes."
  ],
  [
    "Permanência por especialidade — IPE",
    "Faz a mesma comparação por especialidade, excluindo o próprio hospital da referência regional.",
    "Não ajusta a gravidade dos pacientes nem mede qualidade ou desfecho."
  ],
  [
    "Valor aprovado por internação — CMI",
    "Divide o valor aprovado no SIH pelas internações novas; a correção aplica o IPCA para expressar o resultado em preços da competência de referência IPCA indicada na metodologia.",
    "Não é o custo contábil completo da internação."
  ],
  [
    "Comparação sazonal — IS",
    "Compara as internações do mês com uma referência do mesmo mês em anos anteriores.",
    "Não é uma previsão do que vai acontecer."
  ],
  [
    "Taxa de internação de residentes",
    "Divide as internações de residentes atendidos em São Paulo pela população e apresenta o resultado por 100 mil habitantes.",
    "Não inclui atendimentos realizados fora do estado."
  ],
  [
    "Evasão observada",
    "Mostra a parcela das internações de residentes atendidos em São Paulo que aconteceu em outra Região de Saúde paulista.",
    "Não mede todos os deslocamentos e não prova falta de oferta na região de origem."
  ],
  [
    "Atração assistencial",
    "Mostra a parcela das internações de uma região que atende pessoas de fora dela.",
    "Receber pacientes de outras regiões pode fazer parte do papel de um centro de referência."
  ],
  [
    "Condições sensíveis à atenção primária — ICSAP",
    "Conta as internações dos grupos da portaria por local de residência e calcula a taxa por 10 mil habitantes.",
    "Não demonstra que uma internação individual poderia ter sido evitada. A participação exibida usa todas as internações novas observadas de residentes; não é a proporção clínica oficial."
  ],
  [
    "Pressão estimada — IPH",
    "Relaciona os dias de atendimento estimados à capacidade dos leitos SUS declarados. Veja a explicação na [próxima seção](#iph).",
    "Não é uma medição da ocupação física dos leitos."
  ]
]
