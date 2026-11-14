import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { Messages } from '../i18n/en';

interface Props { t: Messages; onRestart: () => void; children: ReactNode }
interface State { failed: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) console.error(error, info);
  }

  render(): ReactNode {
    const { t } = this.props;
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-view" id="main">
        <h1>{t.common.errorTitle}</h1>
        <p>{t.common.errorBody}</p>
        <button type="button" className="btn btn-primary" onClick={() => { this.setState({ failed: false }); this.props.onRestart(); }}>
          {t.common.restartScenario}
        </button>
      </main>
    );
  }
}
