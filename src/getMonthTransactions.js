const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, QueryCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async (event) => {
    const { month } = event.pathParameters; // Month in YYYY-MM format

    try {
        // Adjust the range to the entire month
        const startDate = `${month}-01`; // Assuming the month starts from the first
        const endDate = new Date(year, parseInt(month.split('-')[1]), 0).toISOString().split('T')[0]; // Automatically adjust to the last day of the month

        const params = {
            TableName: TABLE_NAME,
            IndexName: "DateIndex",
            KeyConditionExpression: "date BETWEEN :start and :end",
            ExpressionAttributeValues: {
                ":start": startDate,
                ":end": endDate
            }
        };

        const { Items } = await docClient.send(new QueryCommand(params));

        // Calculate running balances if needed
        let runningTotal = 0;
        Items.forEach(item => {
            runningTotal += item.amount;
            item.runningTotal = runningTotal; // Add running total to each item
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Successfully retrieved month transactions',
                transactions: Items
            }),
        };
    } catch (error) {
        console.error('Error retrieving month transactions:', error);
        return {
            statusCode: 400,
            body: JSON.stringify({
                message: 'Failed to retrieve month transactions',
                error: error.message
            }),
        };
    }
};
