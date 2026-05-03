import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <h1>Unauthorized</h1>
        <p>Your account role does not have access to this page.</p>
        <Link className="button primary" to="/">Return to dashboard</Link>
      </section>
    </main>
  );
}
