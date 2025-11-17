import React, { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend 
} from 'chart.js';
import './App.css';

ChartJS.register(ArcElement, Tooltip, Legend);

// --- A new component for the "Portfolio Summary" ---
// This makes our main App component cleaner
function AnalysisResults({ portfolioData }) {
  // Prepare chart data
  const chartData = {
    labels: portfolioData.holdings.map(h => h.ticker),
    datasets: [
      {
        label: 'Market Value',
        data: portfolioData.holdings.map(h => h.market_value),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
        ],
      },
    ],
  };

  return (
    <>
      <div className="summary-section">
        <h2>Portfolio Summary</h2>
        <div className="summary-grid">
          <div className="summary-text">
            <p><strong>Total Value:</strong> ${portfolioData.portfolio_summary.total_market_value.toFixed(2)}</p>
            <p><strong>Total Gain/Loss:</strong> ${portfolioData.portfolio_summary.total_unrealized_gain_loss.toFixed(2)}</p>
            <p><strong>Total Cost:</strong> ${portfolioData.portfolio_summary.total_cost_basis.toFixed(2)}</p>
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
              <th>Ticker</th>
              <th>Quantity</th>
              <th>Current Price</th>
              <th>Market Value</th>
              <th>Cost Basis</th>
              <th>Gain/Loss</th>
            </tr>
          </thead>
          <tbody>
            {portfolioData.holdings.map((holding) => (
              <tr key={holding.ticker}>
                <td>{holding.ticker}</td>
                <td>{holding.quantity}</td>
                <td>${holding.current_price.toFixed(2)}</td>
                <td>${holding.market_value.toFixed(2)}</td>
                <td>${holding.total_cost.toFixed(2)}</td>
                <td>${holding.unrealized_gain_loss.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --- Main App Component ---
function App() {
  // State for the user's *input* portfolio
  const [holdings, setHoldings] = useState([]);
  
  // State for the *form inputs*
  const [form, setForm] = useState({ ticker: '', quantity: '', cost_basis: '' });
  
  // State for the *results* from the API
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update form state as user types
  const handleFormChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // Add the holding from the form to our 'holdings' list
  const handleAddHolding = (e) => {
    e.preventDefault(); // Prevent page reload
    // Simple validation
    if (!form.ticker || !form.quantity || !form.cost_basis) {
      alert("Please fill out all fields.");
      return;
    }
    
    // Add new holding to the list (and force ticker to uppercase)
    setHoldings([...holdings, { ...form, ticker: form.ticker.toUpperCase() }]);
    
    // Clear the form
    setForm({ ticker: '', quantity: '', cost_basis: '' });
  };

  // --- This is the new FETCH logic ---
  const handleAnalyze = async () => {
    if (holdings.length === 0) {
      alert("Please add at least one holding to analyze.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null); // Clear previous results

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send our 'holdings' state as the JSON body
        body: JSON.stringify({ holdings: holdings }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalysis(data); // Save the results
    } catch (e) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Portfolio Analyzer</h1>
      </header>

      {/* --- Section 1: Input Form --- */}
      <div className="input-section">
        <h2>Build Your Portfolio</h2>
        <form onSubmit={handleAddHolding} className="holding-form">
          <input
            name="ticker"
            value={form.ticker}
            onChange={handleFormChange}
            placeholder="Ticker (e.g., AAPL)"
          />
          <input
            name="quantity"
            type="number"
            value={form.quantity}
            onChange={handleFormChange}
            placeholder="Quantity (e.g., 10)"
          />
          <input
            name="cost_basis"
            type="number"
            value={form.cost_basis}
            onChange={handleFormChange}
            placeholder="Cost per Share (e.g., 150.00)"
          />
          <button type="submit">Add Holding</button>
        </form>

        {/* --- List of holdings added so far --- */}
        <div className="current-holdings">
          <h3>Current Holdings</h3>
          <ul>
            {holdings.length === 0 ? (
              <li>No holdings added yet.</li>
            ) : (
              holdings.map((h, index) => (
                <li key={index}>
                  {h.quantity} shares of {h.ticker} @ ${h.cost_basis}
                </li>
              ))
            )}
          </ul>
        </div>
        
        {/* --- The "Analyze" button --- */}
        <button 
          onClick={handleAnalyze} 
          className="analyze-button" 
          disabled={isLoading || holdings.length === 0}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Portfolio'}
        </button>
      </div>
      
      {/* --- Section 2: Results --- */}
      {error && <div className="error-message">Error: {error}</div>}
      
      {/* Only show the results component if we have analysis data */}
      {analysis && <AnalysisResults portfolioData={analysis} />}
    </div>
  );
}

export default App;