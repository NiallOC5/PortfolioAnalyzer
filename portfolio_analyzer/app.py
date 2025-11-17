from flask import Flask, jsonify, request  # <-- 1. Import 'request'
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

ALPHA_VANTAGE_API_KEY = "YOUR_API_KEY_HERE"

# (We can now delete the MOCK_PORTFOLIO variable, as it's no longer used)

def fetch_price_from_api(ticker):
    """Fetches a single stock price from Alpha Vantage."""
    url = (
        "https://www.alphavantage.co/query?"
        f"function=GLOBAL_QUOTE&symbol={ticker}&"
        f"apikey={ALPHA_VANTAGE_API_KEY}"
    )
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if "Global Quote" in data and "05. price" in data["Global Quote"]:
            return float(data["Global Quote"]["05. price"])
        else:
            print(f"Warning: Price data not found for {ticker}. API response: {data}")
            return None
            
    except requests.RequestException as e:
        print(f"Error fetching {ticker}: {e}")
        return None
    except (KeyError, ValueError):
        print(f"Error parsing price for {ticker}.")
        return None

@app.route("/")
def hello_world():
    return "Hello, this is the portfolio analyzer API!"

# --- MODIFIED ANALYSIS ENDPOINT ---
@app.route("/analyze", methods=['POST'])  # <-- 2. Allow POST requests
def analyze_portfolio():
    """
    Analyzes a portfolio sent in the request body.
    Expects JSON data in the format:
    {
        "holdings": [
            {"ticker": "IBM", "quantity": 10, "cost_basis": 150.00},
            ...
        ]
    }
    """
    
    # 3. Get the portfolio from the request's JSON body
    portfolio = request.json
    
    if 'holdings' not in portfolio:
        return jsonify({"error": "Missing 'holdings' in request"}), 400

    analyzed_holdings = []
    total_portfolio_value = 0.0
    total_portfolio_cost = 0.0
    
    # 4. Loop over the 'holdings' from the request, NOT the mock data
    for holding in portfolio["holdings"]:
        ticker = holding["ticker"]
        # Make sure to convert quantity and cost_basis to numbers
        quantity = float(holding["quantity"])
        cost_basis = float(holding["cost_basis"])
        
        current_price = fetch_price_from_api(ticker)
        
        if current_price is None:
            continue 
            
        total_cost_for_holding = cost_basis * quantity
        market_value = current_price * quantity
        unrealized_gain_loss = market_value - total_cost_for_holding
        
        total_portfolio_value += market_value
        total_portfolio_cost += total_cost_for_holding
        
        analyzed_holdings.append({
            "ticker": ticker,
            "quantity": quantity,
            "cost_basis_per_share": cost_basis,
            "total_cost": total_cost_for_holding,
            "current_price": current_price,
            "market_value": market_value,
            "unrealized_gain_loss": unrealized_gain_loss
        })
    
    total_portfolio_gain_loss = total_portfolio_value - total_portfolio_cost
    
    response = {
        "portfolio_summary": {
            "total_market_value": total_portfolio_value,
            "total_cost_basis": total_portfolio_cost,
            "total_unrealized_gain_loss": total_portfolio_gain_loss
        },
        "holdings": analyzed_holdings
    }
    
    return jsonify(response)


if __name__ == "__main__":
    app.run(debug=True)