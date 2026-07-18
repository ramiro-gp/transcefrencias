import type { Profile } from './profile-service'

export function displayProfileName(
  profile: Pick<Profile, 'fullName' | 'nickname'>,
): string {
  return profile.nickname ?? profile.fullName
}
