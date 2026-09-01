#!/usr/bin/env bash
set -euo pipefail

# Monta o ZIP único que vai para o FIAP ON.
#
# Não depende de `zip` nem de `unzip`: nenhum dos dois está instalado na
# máquina onde a entrega é montada, e a versão anterior deste roteiro falhava
# ali sem nunca ter sido executada até o fim. O empacotamento usa o zipfile do
# Python, que já é dependência do pipeline do deck.

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

# Este arquivo existe em duas árvores: no repositório acadêmico, em
# entregues/sprint_2, e dentro do próprio medflow, em docs/entrega_sprint_2. A
# distância até a raiz do medflow é diferente nas duas, então ela é procurada
# em vez de calculada — assim as duas cópias ficam idênticas.
for candidato in "$script_dir/../../medflow" "$script_dir/../.."; do
  if [[ -f "$candidato/Makefile" && -d "$candidato/src/medflow" ]]; then
    medflow_dir="$(cd -- "$candidato" && pwd)"
    break
  fi
done
if [[ -z "${medflow_dir:-}" ]]; then
  printf 'ERRO: não encontrei a raiz do repositório medflow a partir de %s\n' "$script_dir" >&2
  exit 1
fi

presentation_dir="$script_dir/apresentacao"
pptx="$presentation_dir/EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx"
spreadsheet="$script_dir/Informacoes_Finais_Projeto_Integrantes_v1.xlsx"
output="$script_dir/EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.zip"

# A tag do código que vai no ZIP. Fica numa variável só porque estava escrita
# duas vezes e ficou para trás: o ZIP empacotava a v0.3.1 enquanto o produto
# apresentado já era a v1.0.1.
source_tag="v1.0.2"

# ---------------------------------------------------------------- 1. arquivos
for required in "$pptx" "$spreadsheet"; do
  if [[ ! -f "$required" ]]; then
    printf 'ERRO: arquivo obrigatório ausente: %s\n' "$required" >&2
    exit 1
  fi
done

# ------------------------------------------------------------- 2. link do vídeo
# A URL é conferida DENTRO do .pptx entregue, e não num gerador.
#
# A trava antiga lia a constante VIDEO_URL de gerar_apresentacao.py, um gerador
# que já não produzia o deck. Preencher a URL lá satisfazia a trava sem o link
# aparecer em slide nenhum, e o link no PPT é regra da FIAP, não acabamento.
#
# Desde 31/08 os geradores saíram e o .pptx é a fonte da verdade: a URL vai
# escrita no slide de conclusão, pelo PowerPoint, e conferida aqui.
if ! python3 - "$pptx" <<'PY'
import re, sys, zipfile

with zipfile.ZipFile(sys.argv[1]) as z:
    nomes = [n for n in z.namelist() if re.fullmatch(r"ppt/slides/slide\d+\.xml", n)]
    if not nomes:
        print("ERRO: o .pptx não tem slides legíveis.", file=sys.stderr)
        raise SystemExit(1)
    texto = "".join(z.read(n).decode("utf-8", "replace") for n in nomes)

if not re.search(r"https?://(www\.)?(youtube\.com|youtu\.be)/", texto):
    raise SystemExit(1)
PY
then
  printf '%s\n' 'ERRO: não há link do YouTube dentro do PPTX entregue.' >&2
  printf '%s\n' '      Escreva a URL no slide final do .pptx, salve e rode de novo.' >&2
  exit 1
fi

# ------------------------------------------------------------------- 3. a tag
if ! git -C "$medflow_dir" rev-parse --verify --quiet "${source_tag}^{commit}" >/dev/null; then
  printf 'ERRO: tag %s não encontrada no repositório medflow.\n' "$source_tag" >&2
  exit 1
fi

# A tag ficar para trás de main é silencioso e caro: o ZIP fecha, parece certo,
# e leva um código anterior ao que foi apresentado. Já aconteceu — o pacote
# apontava para v0.3.1 enquanto o produto no ar era v1.0.1.
tag_commit="$(git -C "$medflow_dir" rev-parse "${source_tag}^{commit}")"
main_commit="$(git -C "$medflow_dir" rev-parse 'main^{commit}')"
if [[ "$tag_commit" != "$main_commit" ]]; then
  atras="$(git -C "$medflow_dir" rev-list --count "${source_tag}..main")"
  printf 'ERRO: a tag %s está %s commit(s) atrás de main.\n' "$source_tag" "$atras" >&2
  printf '      O ZIP empacotaria código anterior ao que está publicado.\n' >&2
  printf '      Publique uma versão nova e atualize source_tag, ou aponte\n' >&2
  printf '      source_tag para a tag que corresponde ao produto apresentado.\n' >&2
  exit 1
fi

# -------------------------------------------------------------- 4. empacotar
temporary_dir="$(mktemp -d)"
trap 'rm -r -- "$temporary_dir"' EXIT
temporary_zip="$temporary_dir/entrega.zip"

git -C "$medflow_dir" archive --format=zip --prefix=medflow/ --output="$temporary_zip" "$source_tag"

python3 - "$temporary_zip" "$pptx" "$spreadsheet" <<'PY'
import sys, zipfile
from pathlib import Path

alvo, *anexos = sys.argv[1:]

with zipfile.ZipFile(alvo, "a", zipfile.ZIP_DEFLATED) as z:
    for caminho in anexos:
        z.write(caminho, Path(caminho).name)

# Conferir depois de escrever: um ZIP corrompido só aparece na mão do avaliador.
with zipfile.ZipFile(alvo) as z:
    ruim = z.testzip()
    if ruim is not None:
        print(f"ERRO: entrada corrompida no ZIP: {ruim}", file=sys.stderr)
        raise SystemExit(1)
    nomes = set(z.namelist())

for caminho in anexos:
    if Path(caminho).name not in nomes:
        print(f"ERRO: {Path(caminho).name} não entrou no ZIP.", file=sys.stderr)
        raise SystemExit(1)
PY

mv -- "$temporary_zip" "$output"

printf '%s\n' "$output"
