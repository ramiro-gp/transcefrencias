const keyFor = (invitationId: string) => `transcefrencias.invitation.${invitationId}`

export function readInvitationSecret(invitationId: string): string | null {
  return sessionStorage.getItem(keyFor(invitationId))
}

export function storeInvitationSecret(invitationId: string, secret: string) {
  sessionStorage.setItem(keyFor(invitationId), secret)
}

export function clearInvitationSecret(invitationId: string) {
  sessionStorage.removeItem(keyFor(invitationId))
}

export function invitationUrl(invitation: {
  readonly invitationId: string
  readonly token: string
}): string {
  return `${window.location.origin}/invitacion/${invitation.invitationId}#${invitation.token}`
}
