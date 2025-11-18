import React, { useReducer } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import './App.css';

ChartJS.register(ArcElement, Tooltip, Legend);

const initialState = {
  holdings: [],
  form: { ticker: '', quantity: '', cost_basis: '' },
  analysis: null,
  isLoading: false,
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_FORM_FIELD':
      return { ...state, form: { ...state.form, [action.field]: action.value } };
    case 'ADD_HOLDING':
      return {
        ...state,
        holdings: [...state.holdings, action.holding],
        form: initialState.form, // Reset form
      };
    case 'REMOVE_HOLDING':
      return {
        ...state,
        holdings: state.holdings.filter((_, index) => index !== action.index),
      };
    case 'FETCH_START':
      return { ...state, isLoading: true, error: null, analysis: null };
    case 'FETCH_SUCCESS':
      return { ...state, isLoading: false, analysis: action.payload };
    case 'FETCH_ERROR':
      return { ...state, isLoading: false, error: action.payload };
    default:
      throw new Error();
  }
}

function AnalysisResults({ data }) {
  const { portfolio_summary, holdings: analyzedHoldings } = data;

  const chartData = {
    labels: analyzedHoldings.filter(h => !h.error).map(h => h.ticker),
    datasets: [
      {
        label: 'Market Value',
        data: analyzedHoldings.filter(h => h.market_value).map(h => h.market_value),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
        ],
      },
    ],
  };

  return (
    <div className="results-section">
      <div className="summary-section">
        <h2>Portfolio Summary</h2>
        <div className="summary-grid">
          <div className="summary-text">
            <p><strong>Total Value:</strong> ${portfolio_summary.total_market_value.toFixed(2)}</p>
            <p><strong>Total Gain/Loss:</strong> ${portfolio_summary.total_unrealized_gain_loss.toFixed(2)}</p>
            <p><strong>Total Cost:</strong> ${portfolio_summary.total_cost_basis.toFixed(2)}</p>
          </div>
          <div className="summary-chart">
            <Pie data={chartData} />
          </div>
        </div>
      </div>
      <div className="holdings-section">
        <h2>Holdings</h2>
        <table>
          <thead>
            <tr>
              <th>Ticker</th><th>Quantity</th><th>Current Price</th>
              <th>Market Value</th><th>Cost Basis</th><th>Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {analyzedHoldings.map((holding) => (
              holding.error ? (
                <tr key={holding.ticker} className="holding-error">
                  <td>{holding.ticker}</td>
                  <td colSpan="5">{holding.error}</td>
                </tr>
              ) : (
                <tr key={holding.ticker}>
                  <td>{holding.ticker}</td>
                  <td>{holding.quantity}</td>
                  <td>${(holding.current_price || 0).toFixed(2)}</td>
                  <td>${(holding.market_value || 0).toFixed(2)}</td>
                  <td>${(holding.total_cost || 0).toFixed(2)}</td>
                  <td>${(holding.unrealized_gain_loss || 0).toFixed(2)}</td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { holdings, form, analysis, isLoading, error } = state;

  const handleFormChange = (e) => {
    dispatch({ type: 'SET_FORM_FIELD', field: e.target.name, value: e.target.value });
  };

  const handleAddHolding = (e) => {
    e.preventDefault();
    if (!form.ticker || !form.quantity || !form.cost_basis) {
      alert("Please fill out all fields.");
      return;
    }
    dispatch({
      type: 'ADD_HOLDING',
      holding: {
        ...form,
        ticker: form.ticker.toUpperCase(),
        quantity: Number(form.quantity),
        cost_basis: Number(form.cost_basis)
      },
    });
  };

  const handleRemoveHolding = (indexToRemove) => {
    dispatch({ type: 'REMOVE_HOLDING', index: indexToRemove });
  };

  const handleAnalyze = async () => {
    if (holdings.length === 0) {
      alert("Please add at least one holding to analyze.");
      return;
    }

    dispatch({ type: 'FETCH_START' });

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holdings: holdings }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown HTTP error occurred.' }));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Portfolio Analyzer</h1>
      </header>

      <div className="input-section">
        <h2>Build Your Portfolio</h2>
        <form onSubmit={handleAddHolding} className="holding-form">
          <input
            name="ticker"
            value={form.ticker}
            onChange={handleFormChange}
            placeholder="Ticker (e.g., AAPL)"
            autoComplete="off"
          />
          <input
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleFormChange}
            placeholder="Quantity (e.g., 10)"
            autoComplete="off"
          />
          <input
            name="cost_basis"
            type="number"
            value={form.cost_basis}
            onChange={handleFormChange}
            placeholder="Cost per Share (e.g., 150.00)"
            autoComplete="off"
          />
          <button type="submit">Add Holding</button>
        </form>

        <div className="current-holdings">
          <h3>Current Holdings</h3>
          <ul>
            {holdings.length === 0 ? (
              <li>No holdings added yet.</li>
            ) : (
              holdings.map((h, index) => (
                <li key={index}>
                  {h.quantity} shares of {h.ticker} @ ${h.cost_basis}
                  <button onClick={() => handleRemoveHolding(index)} className="remove-button">
                    &times;
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <button
          onClick={handleAnalyze}
          className="analyze-button"
          disabled={isLoading || holdings.length === 0}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
        </button>
      </div>

      {isLoading && <div className="loading-message">Analyzing...</div>}
      {error && <div className="error-message">Error: {error}</div>}
      {analysis && <AnalysisResults data={analysis} />}
    </div>
  );
}

export default App;