import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useAuth } from '../app/auth-context'
import { FieldErrorMessage, FormFeedback } from '../features/auth/auth-form-fields'
import { profileSchema, type ProfileValues } from '../features/auth/auth-schemas'
import { ProfileName } from '../features/profile/profile-name'
import { updateOwnProfile } from '../features/profile/profile-service'
import { profileQueryKey, useProfileQuery } from '../features/profile/use-profile-query'
import { supabase } from '../lib/supabase/client'

export function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const profile = useProfileQuery(user?.id ?? null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: { fullName: '', nickname: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: ProfileValues) => updateOwnProfile(supabase, user!.id, values),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileQueryKey(updatedProfile.id), updatedProfile)
    },
  })

  useEffect(() => {
    if (profile.data) {
      reset({ fullName: profile.data.fullName, nickname: profile.data.nickname ?? '' })
    }
  }, [profile.data, reset])

  async function onSubmit(values: ProfileValues) {
    setFeedback(null)

    try {
      await mutation.mutateAsync(values)
      setFeedback('Perfil actualizado.')
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'No pudimos actualizar tu perfil.',
      )
    }
  }

  if (profile.isLoading) {
    return (
      <section className="page-state" role="status" aria-live="polite">
        <p className="eyebrow">PERFIL</p>
        <p>CARGANDO PERFIL…</p>
      </section>
    )
  }

  if (profile.isError || !profile.data) {
    return (
      <section className="page-state" role="alert">
        <p className="eyebrow">PERFIL</p>
        <p>
          {profile.error?.message ?? 'No encontramos el perfil asociado a esta cuenta.'}
        </p>
        {profile.isError ? (
          <button className="button" type="button" onClick={() => void profile.refetch()}>
            REINTENTAR
          </button>
        ) : null}
      </section>
    )
  }

  return (
    <section className="form-page" aria-labelledby="profile-title">
      <p className="eyebrow">PERFIL</p>
      <h1 id="profile-title">
        <ProfileName profile={profile.data} />
      </h1>
      <p className="intro-copy">
        Actualizá cómo se muestra tu identidad en la aplicación.
      </p>
      <form
        className="form-stack"
        noValidate
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div className="field">
          <label htmlFor="profile-full-name">Nombre</label>
          <input
            id="profile-full-name"
            type="text"
            autoComplete="name"
            aria-describedby={errors.fullName ? 'profile-full-name-error' : undefined}
            {...register('fullName')}
          />
          <FieldErrorMessage id="profile-full-name-error" error={errors.fullName} />
        </div>
        <div className="field">
          <label htmlFor="profile-nickname">Apodo opcional</label>
          <input
            id="profile-nickname"
            type="text"
            autoComplete="nickname"
            aria-describedby={errors.nickname ? 'profile-nickname-error' : undefined}
            {...register('nickname')}
          />
          <FieldErrorMessage id="profile-nickname-error" error={errors.nickname} />
        </div>
        <FormFeedback message={feedback} />
        <button
          className="button button-primary button-wide"
          type="submit"
          disabled={isSubmitting || mutation.isPending}
        >
          {isSubmitting || mutation.isPending ? 'GUARDANDO…' : 'GUARDAR PERFIL'}
        </button>
      </form>
      <nav className="form-links" aria-label="Acciones de perfil">
        <Link to="/inicio">VOLVER AL INICIO</Link>
      </nav>
    </section>
  )
}
