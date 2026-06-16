import './App.css'

function App() {
  return (
    <main className="app-shell">
      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">Browser instrument prototype</p>
        <h1 id="page-title">Spirophonic</h1>
        <p className="summary">
          Cyclic relationships become traces, motion, color, and sound from one
          shared model.
        </p>
      </section>

      <section className="status-panel" aria-labelledby="status-title">
        <h2 id="status-title">Initial scaffold</h2>
        <ul>
          <li>Vite, React, and TypeScript are wired.</li>
          <li>Vitest is ready for core math tests.</li>
          <li>Implementation starts with the relationship engine.</li>
        </ul>
      </section>
    </main>
  )
}

export default App
