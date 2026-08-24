import { useSimulator } from './hooks/useSimulator'
import { InquiryPanel } from './components/InquiryPanel'
import { PaymentPanel } from './components/PaymentPanel'
import { ActivityLog } from './components/ActivityLog'
import { StateViewer } from './components/StateViewer'

function App() {
  const { log, clearLog, runInquiry, runPayment, fetchTransactions, fetchRefunds } =
    useSimulator()

  return (
    <main className="app">
      <header className="topbar">
        <h1>VA Bank App Simulator</h1>
        <p className="topbar__subtitle">
          Simulate a bank app driving VA inquiry and payment flows against the mock TCB backend.
        </p>
      </header>
      <div className="app__grid">
        <InquiryPanel onInquiry={runInquiry} />
        <PaymentPanel onPayment={runPayment} />
        <StateViewer fetchTransactions={fetchTransactions} fetchRefunds={fetchRefunds} />
      </div>
      <ActivityLog log={log} onClear={clearLog} />
    </main>
  )
}

export default App
