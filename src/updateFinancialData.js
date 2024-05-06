const { Configuration, PlaidApi, PlaidEnvironments, TransactionsGetRequest } = require('plaid');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV; // 'sandbox', 'development', or 'production'
const TABLE_NAME = process.env.TABLE_NAME;

// Initialize Plaid client
const config = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': PLAID_CLIENT_ID,
      'PLAID-SECRET': PLAID_SECRET,
    },
  },
});

const plaidClient = new PlaidApi(config);

exports.handler = async (event) => {
    const { ledgerId, accessToken } = JSON.parse(event.body);

    try {
        // Fetch updated transactions from Plaid
        const transactionsResponse = await plaidClient.transactionsGet({
            access_token: accessToken,
            start_date: '2021-01-01',
            end_date: '2021-12-31',
        });

        // Example update logic
        for (let transaction of transactionsResponse.data.transactions) {
            const updateParams = {
                TableName: TABLE_NAME,
                Key: {
                    PK: `LEDGER#${ledgerId}`,
                    SK: `TRANSACTION#${transaction.transaction_id}`
                },
                UpdateExpression: "set amount = :a, description = :d, date = :dt",
                ExpressionAttributeValues: {
                    ":a": transaction.amount,
                    ":d": transaction.name,
                    ":dt": transaction.date
                }
            };

            // Update the transaction in DynamoDB
            await docClient.send(new UpdateCommand(updateParams));
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Financial data updated successfully',
                updatedTransactions: transactionsResponse.data.transactions.length
            }),
        };
    } catch (error) {
        console.error('Error updating financial data:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to update financial data',
                error: error.message
            }),
        };
    }
};
