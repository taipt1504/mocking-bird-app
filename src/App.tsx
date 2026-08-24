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
      <h1>VA Bank App Simulator</h1>
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
