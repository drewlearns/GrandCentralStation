const { DynamoDBClient, ScanCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const tableName = process.env.DYNAMODB_TABLE;

exports.handler = async (event) => {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    let disabledFamilies = [];  // List to keep track of disabled families

    const scanParams = {
        TableName: tableName,
        FilterExpression: "#createdAt <= :fourteenDaysAgo AND attribute_not_exists(subscribed)",
        ExpressionAttributeNames: {
            "#createdAt": "createdAt",
        },
        ExpressionAttributeValues: {
            ":fourteenDaysAgo": { S: fourteenDaysAgo },
        },
    };

    try {
        const scanCommand = new ScanCommand(scanParams);
        const result = await dynamoDBClient.send(scanCommand);
        console.log("Scan result:", result);

        if (!result.Items || result.Items.length === 0) {
            console.log("No families found to update.");
            return { disabledFamilies };
        }

        for (const family of result.Items) {
            console.log("Processing family:", family);
            const updateParams = {
                TableName: tableName,
                Key: {
                    PK: { S: family.PK.S },  // Ensure this matches your primary key's type
                    SK: { S: family.SK.S }  // and sort key's type
                },
                UpdateExpression: "set #access = :value",
                ExpressionAttributeNames: {
                    "#access": "accessDisabled"
                },
                ExpressionAttributeValues: {
                    ":value": { BOOL: true }
                },
            };
            const updateCommand = new UpdateItemCommand(updateParams);
            await dynamoDBClient.send(updateCommand);
            disabledFamilies.push({ FamilyID: family.PK.S });  // Add family ID to the list
        }

        return { disabledFamilies };  // Return the list of disabled families
    } catch (error) {
        console.error("Error disabling access for families:", error);
        throw error;
    }
};
