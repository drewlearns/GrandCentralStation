const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ authToken: token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    console.log("verifyToken response payload:", payload);

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    const nestedPayload = JSON.parse(payload.body);

    console.log("verifyToken nested payload:", nestedPayload);

    return nestedPayload;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    let parsedBody;

    try {
        parsedBody = JSON.parse(event.body);
        console.log('Parsed request body:', parsedBody);
    } catch (error) {
        console.error('Error parsing request body:', error);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid request body' }),
        };
    }

    const { authToken, householdId } = parsedBody;

    // Validate required fields
    if (!authToken) {
        console.error('Authorization token is missing');
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Authorization token is missing' }),
        };
    }

    if (!householdId) {
        console.error('householdId is missing');
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'householdId is missing' }),
        };
    }

    try {
        // Verify the token
        const user = await verifyToken(authToken);
        const deletedBy = user.user_id;

        if (!deletedBy) {
            throw new Error('Invalid token payload: missing user_id');
        }

        // Fetch household and owner information
        const household = await prisma.household.findUnique({
            where: { householdId: householdId },
            include: {
                members: true,
            },
        });

        if (!household) {
            console.error('Household not found');
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const owner = household.members.find(member => member.role === 'owner');

        console.log("Current user UUID:", deletedBy);
        console.log("Owner UUID:", owner ? owner.memberUuid : "None");

        if (!owner || owner.memberUuid !== deletedBy) {
            console.error('Not authorized to delete this household');
            return {
                statusCode: 403,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'You are not authorized to delete this household',
                }),
            };
        }

        await prisma.$transaction(async (prisma) => {
            // Delete related data in the correct order to avoid foreign key constraint issues
            await prisma.attachments.deleteMany({
                where: {
                    ledgerId: {
                        in: (await prisma.ledger.findMany({
                            where: { householdId: householdId },
                            select: { ledgerId: true }
                        })).map(ledger => ledger.ledgerId)
                    }
                }
            });

            await prisma.transaction.deleteMany({
                where: {
                    ledgerId: {
                        in: (await prisma.ledger.findMany({
                            where: { householdId: householdId },
                            select: { ledgerId: true }
                        })).map(ledger => ledger.ledgerId)
                    }
                }
            });

            await prisma.householdMembers.deleteMany({ where: { householdId: householdId } });
            await prisma.incomes.deleteMany({ where: { householdId: householdId } });
            await prisma.ledger.deleteMany({ where: { householdId: householdId } });
            await prisma.bill.deleteMany({ where: { householdId: householdId } });
            await prisma.preferences.deleteMany({ where: { householdId: householdId } });
            await prisma.invitations.deleteMany({ where: { householdId: householdId } });
            await prisma.paymentSource.deleteMany({ where: { householdId: householdId } });

            // Now delete the household
            await prisma.household.delete({
                where: { householdId: householdId },
            });
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Household deleted successfully',
                householdId: householdId,
            }),
        };
    } catch (error) {
        console.error('Error deleting household:', error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: 'Error deleting household',
                error: error.message,
            }),
        };
    } finally {
        await prisma.$disconnect();
    }
};
