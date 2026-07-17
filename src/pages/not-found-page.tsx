import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="intro not-found" aria-labelledby="not-found-title">
      <p className="eyebrow">ERROR 404</p>
      <h1 id="not-found-title">Esta ruta no existe.</h1>
      <p className="intro-copy">Volvé al inicio para continuar.</p>
      <Link className="button button-primary link-button" to="/">
        VOLVER AL INICIO
      </Link>
    </section>
  )
}
