# APEX + Select AI — como a demonstração foi montada

Estado conferido no Oracle em 25/08/2026, com a demonstração **concluída e
validada**:

- APEX **26.1.3** disponível no Autonomous Database;
- pacote `MEDFLOW_SELECT_AI` válido;
- workspace `MEDFLOW_DEMO`, schema de parsing `MEDFLOW`, conta de
  desenvolvimento `MEDFLOW_DEV`;
- aplicação **MedFlow — Select AI**, App **100**, Página **1 — Investigar com
  Select AI**;
- tabela `SELECT_AI_RESPOSTA` com o rastro da demonstração: ID **23**, a
  pergunta principal, e ID **24**, a pergunta-limite que dispara o aviso;
- export versionado em
  [`05_aplicacao_medflow_select_ai.sql`](../../medflow/db/apex/05_aplicacao_medflow_select_ai.sql);
- captura real em
  [`apex_select_ai_real.png`](apresentacao/capturas/apex_select_ai_real.png),
  já usada no slide 16 da apresentação.

O restante deste arquivo deixou de ser uma lista de pendências. Ele é o registro
reproduzível do caminho percorrido: o que permite remontar o workspace do zero
caso a instância precise ser recriada antes da banca.

## Links

- Administração direta do APEX (alternativa; o SSO pode terminar em 404 antes
  do primeiro workspace):  
  <https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com/ords/apex_admin>
- Acesso geral ao APEX, depois de criar o workspace:  
  <https://gf68e03b2a30d55-medflow.adb.sa-saopaulo-1.oraclecloudapps.com/ords/apex>
- Produto público MedFlow:  
  <https://lucas-d-s-1.github.io/medflow/>
- Repositório e arquivos do APEX:  
  <https://github.com/Lucas-D-S-1/medflow/tree/main/db/apex>
- Procedimento oficial da Oracle para criar workspace no Autonomous Database:  
  <https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/apex-create-workspace.html>
- Procedimento oficial para abrir o App Builder:  
  <https://docs.oracle.com/en/cloud/paas/autonomous-database/serverless/adbsb/apex-access-appbuilder.html>

## 1. Criar o workspace — precisa do ADMIN

O caminho principal evita a rota do APEX que apresentou 404 depois do SSO:

1. No Console OCI, abrir o Autonomous Database `MEDFLOW`.
2. Abrir o menu **Database actions** e escolher **View all database actions**.
3. Confirmar que a sessão está como **`ADMIN`**. Se estiver como `MEDFLOW`,
   sair e entrar com o usuário de banco `ADMIN` e a senha do `ADMIN`.
4. No Launchpad, abrir **Administration → APEX Workspaces**.
5. No canto superior direito, escolher **Create Workspace**.
6. Preencher:
   - **Workspace name:** `MEDFLOW_DEMO`;
   - **Database user:** selecionar o schema existente `MEDFLOW`;
   - **APEX Administrator:** `MEDFLOW_DEV`;
   - e-mail e senha forte local nos campos solicitados.
7. Não registrar a senha no Git, na apresentação ou neste arquivo.
8. Clicar em **Create**.

A criação feita pela interface configura o workspace e sua conta inicial. Na
autenticação por contas do banco, a Oracle também cria a conta de banco
correspondente quando uma conta de desenvolvedor é criada pela interface.

O arquivo
[`01_criar_workspace.sql`](../../medflow/db/apex/01_criar_workspace.sql) fica
como alternativa de infraestrutura: ele cria apenas o workspace e ainda exige
que a conta de desenvolvimento seja configurada na Administração do APEX. Para
o primeiro acesso, prefira o formulário acima.

### Por que o login direto dá 404

- a senha é aceita pelo SSO;
- o callback segue para `/ords/r/apex/instance-admin/administration-services`;
- em seguida o ORDS redireciona para `/ords/r/apex/instance-admin/f`, que
  responde 404;
- com `MEDFLOW`, isso também é coerente com a ausência do workspace e do papel
  `APEX_ADMINISTRATOR_ROLE`.

Esse encadeamento foi reproduzido em 23/08/2026 com a conta `MEDFLOW`, sem
expor a senha. Se acontecer também com `ADMIN`, usar **Database Actions → APEX
Workspaces**, que não depende da página `instance-admin`.

## 2. Entrar no App Builder

Depois de criar o workspace, reabrir o link geral do APEX e entrar com a conta
criada pela interface:

```text
usuário de banco: MEDFLOW_DEV
workspace:        MEDFLOW_DEMO
```

Na tela **Select a Workspace**, escolher `MEDFLOW_DEMO` e abrir **App Builder**.

## 3. Criar a aplicação e a página

1. **App Builder → Create → New Application**.
2. Nome: `MedFlow — Select AI`.
3. Usar a **Home Page 1** criada pelo assistente e renomeá-la para
   `Investigar com Select AI`; os itens do roteiro usam o prefixo `P1_`.
4. Seguir a montagem detalhada do
   [`db/apex/README.md`](../../medflow/db/apex/README.md): textarea, botão,
   processo PL/SQL, narrativa, relatório, aviso e SQL gerado.
5. Colar o cabeçalho e o CSS de apresentação fornecidos na mesma pasta.

## 4. Pergunta segura para a demonstração

```text
quais as cinco regioes de saude com maior indice de pressao hospitalar medio em 2026
```

O resultado de referência começa por `LIMEIRA`, seguido por
`FRANCO DA ROCHA`, `JUNDIAI`, `SAO JOSE DO RIO PRETO` e
`ALTO VALE DO PARAIBA`.

Não encadear perguntas e não usar “taxa de ocupação” no roteiro principal. As
limitações já medidas estão em
[`LEITURA_SELECT_AI.md`](../../medflow/docs/qualidade/LEITURA_SELECT_AI.md).

## 5. Critério de pronto

- a pergunta grava uma única linha em `SELECT_AI_RESPOSTA`;
- narrativa, relatório e SQL usam o mesmo `P1_ID`;
- o SQL aparece colapsado, como evidência sob demanda;
- termos fora da metodologia fazem a região de aviso aparecer;
- o resultado é descrito como demonstração controlada, nunca como chat público;
- a captura da página pronta já está no slide 16 do PPT; falta apenas
  gravá-la no vídeo da apresentação.
