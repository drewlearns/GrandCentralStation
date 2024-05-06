const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const clientId = process.env.PLAID_CLIENT_ID;
const secret = process.env.PLAID_SECRET;
const environment = process.env.PLAID_ENV; // typically 'sandbox', 'development', or 'production'

// Initialize Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments[environment],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
    },
  },
});

const plaidClient = new PlaidApi(config);

exports.handler = async (event) => {
    const { accessToken } = JSON.parse(event.body); // Expecting to receive the Plaid access token

    try {
        // Fetch transactions from Plaid
        const response = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: '2021-01-01',
            end_date: '2021-12-31',
        });

        // Here you would typically write code to sync these transactions with your database

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Financial data fetched and synced successfully',
                transactions: response.data.transactions,
            }),
        };
    } catch (error) {
        console.error('Error syncing financial data from Plaid:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to sync financial data',
                error: error.message
            }),
        };
    }
};
