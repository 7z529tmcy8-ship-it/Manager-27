import { Component, type ReactNode } from 'react';

/**
 * Auffangnetz: Stürzt irgendein Bildschirm ab, gibt es keinen weißen Bildschirm mehr,
 * sondern einen Hinweis mit „Zurück zum Menü“. Spielstände bleiben unangetastet.
 */
export default class CrashGuard extends Component<{ children: ReactNode }, { error: Error | null; key: number }> {
  state = { error: null as Error | null, key: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Absturz abgefangen:', error);
  }

  render() {
    if (!this.state.error) return <div key={this.state.key} style={{ display: 'contents' }}>{this.props.children}</div>;
    return (
      <div className="crash-guard" role="alert">
        <h2>Ups – da ist etwas schiefgelaufen</h2>
        <p>Dein Spielstand ist gespeichert. Tippe unten, um zurück ins Menü zu kommen.</p>
        <small>{String(this.state.error.message).slice(0, 160)}</small>
        <button className="btn primary big" onClick={() => this.setState((s) => ({ error: null, key: s.key + 1 }))}>Zurück zum Menü</button>
        <button className="btn ghost" onClick={() => location.reload()}>Seite neu laden</button>
      </div>
    );
  }
}
