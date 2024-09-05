'use strict';

module.exports = function (app) {

  // Initialize stockData as an empty object to store stock likes and IPs
  const stockData = {};  // <--- Initialize the stockData object here

  app.route('/api/stock-prices')
    .get(async function (req, res) {
      const fetch = (await import('node-fetch')).default; // Dynamically import node-fetch

      const stocks = [].concat(req.query.stock);  // Handle both single and multiple stocks
      const like = req.query.like === 'true';
      const ip = req.ip;  // Get user's IP address

      try {
        const stockPrices = await Promise.all(stocks.map(stock => fetchStockData(stock, fetch)));

        // Initialize likes if not already set and compute likes for each stock
        stockPrices.forEach(stock => {
          stock.likes = stockData[stock.stock] ? stockData[stock.stock].likes : 0;
        });

        // Process likes if the user liked the stock
        if (like) {
          stocks.forEach(stock => {
            if (!stockData[stock]) {
              stockData[stock] = { likes: 0, ips: new Set() };  // Initialize stockData for a new stock
            }
            if (!stockData[stock].ips.has(ip)) {  // Check if the IP has already liked
              stockData[stock].likes += 1;  // Increment likes
              stockData[stock].ips.add(ip);  // Add the IP to the set
            }
          });
        }

        // Return the result based on the number of stocks requested
        if (stocks.length === 1) {
          res.json({ stockData: stockPrices[0] });
        } else {
          const relLikes = stockPrices[0].likes - stockPrices[1].likes;  // Calculate relative likes
          stockPrices[0].rel_likes = relLikes;
          stockPrices[1].rel_likes = -relLikes;
          res.json({ stockData: stockPrices });
        }

      } catch (error) {
        console.error('Error fetching stock data:', error);  // Log error for debugging
        res.status(500).send('Error fetching stock data');
      }
    });
};

async function fetchStockData(stock, fetch) {
  try {
    const response = await fetch(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${stock}/quote`);
    if (!response.ok) {
      throw new Error(`Error fetching data from proxy: ${response.statusText}`);  // Log fetch error
    }
    const data = await response.json();
    if (!data.symbol || !data.latestPrice) {
      throw new Error(`Invalid data format returned for stock ${stock}: ${JSON.stringify(data)}`);  // Log invalid data format
    }
    return { stock: data.symbol, price: data.latestPrice, likes: 0 };
  } catch (error) {
    console.error('Error in fetchStockData:', error);  // Log any fetch error
    throw error;  // Rethrow error to be caught in the outer try-catch
  }
}
