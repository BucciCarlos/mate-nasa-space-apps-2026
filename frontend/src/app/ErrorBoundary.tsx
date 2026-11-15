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
      <main className="border border-red rounded-md px-4 py-4 bg-red-bg" id="main">
        <h1 className="text-red">{t.common.errorTitle}</h1>
        <p>{t.common.errorBody}</p>
        <button type="button" className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-md font-bold bg-red text-white border border-red cursor-pointer" onClick={() => { this.setState({ failed: false }); this.props.onRestart(); }}>
          {t.common.restartScenario}
        </button>
      </main>
    );
  }
}
