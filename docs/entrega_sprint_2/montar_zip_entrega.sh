#!/usr/bin/env bash
set -euo pipefail

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
generator="$presentation_dir/gerar_apresentacao.py"
pptx="$presentation_dir/EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.pptx"
spreadsheet="$script_dir/Informacoes_Finais_Projeto_Integrantes_v1.xlsx"
output="$script_dir/EC_Sprint_2_1TSCO_EvidenciasConstrucao_MedFlow_OmegaUrbanTech.zip"
# A tag do código que vai no ZIP. Fica numa variável só porque estava escrita
# duas vezes e ficou para trás: o ZIP empacotava a v0.3.1 enquanto o produto
# apresentado já era a v1.0.1.
source_tag="v1.0.1"

if ! grep -Eq '^VIDEO_URL = "https://(www\.)?(youtube\.com|youtu\.be)/' "$generator"; then
  printf '%s\n' 'ERRO: preencha VIDEO_URL no gerador e regenere PPTX/PDF antes do ZIP final.' >&2
  exit 1
fi

for required in "$pptx" "$spreadsheet"; do
  if [[ ! -f "$required" ]]; then
    printf 'ERRO: arquivo obrigatório ausente: %s\n' "$required" >&2
    exit 1
  fi
done

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

temporary_dir="$(mktemp -d)"
trap 'rm -r -- "$temporary_dir"' EXIT
temporary_zip="$temporary_dir/entrega.zip"

git -C "$medflow_dir" archive --format=zip --prefix=medflow/ --output="$temporary_zip" "$source_tag"
zip -q -j "$temporary_zip" "$pptx" "$spreadsheet"
unzip -tq "$temporary_zip" >/dev/null
mv -- "$temporary_zip" "$output"

printf '%s\n' "$output"
