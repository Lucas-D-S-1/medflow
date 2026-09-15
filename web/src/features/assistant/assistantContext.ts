export type AssistantContextIdentity = {
  route: string
  competence: string
  regionCode: string
  hospitalCnes: string
  specialtyCode: string
}

export type SpecialtyContextIdentity = {
  cnes: string
  competence: string
  specialtyCode: string
}

/** Identidade estável da tela que autorizou uma pergunta remota. */
export function assistantContextKey(identity: AssistantContextIdentity): string {
  return [
    identity.route,
    identity.competence,
    identity.regionCode,
    identity.hospitalCnes,
    identity.specialtyCode,
  ].join('|')
}

/**
 * Um atalho local leva um snapshot da especialidade. Ele só pode ser
 * consumido enquanto o resumo ativo ainda representa exatamente o mesmo
 * hospital, mês e especialidade.
 */
export function isCurrentSpecialtySummary(
  requested: SpecialtyContextIdentity | null | undefined,
  active: SpecialtyContextIdentity | null | undefined,
): boolean {
  return Boolean(
    requested &&
      active &&
      requested.cnes === active.cnes &&
      requested.competence === active.competence &&
      requested.specialtyCode === active.specialtyCode,
  )
}
