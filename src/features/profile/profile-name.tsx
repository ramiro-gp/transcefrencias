import { useId, useState } from 'react'
import type { Profile } from './profile-service'

export function ProfileName({
  profile,
}: {
  readonly profile: Pick<Profile, 'fullName' | 'nickname'>
}) {
  const [isNameVisible, setIsNameVisible] = useState(false)
  const nameId = useId()

  if (!profile.nickname) {
    return <span>{profile.fullName}</span>
  }

  return (
    <span className="profile-name">
      <button
        className="profile-nickname"
        type="button"
        aria-expanded={isNameVisible}
        aria-controls={nameId}
        onClick={() => setIsNameVisible((visible) => !visible)}
      >
        {profile.nickname}
      </button>
      {isNameVisible ? <span id={nameId}> ({profile.fullName})</span> : null}
    </span>
  )
}
