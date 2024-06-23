const { PrismaClient } = require('@prisma/client');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const prisma = new PrismaClient();
const lambda = new LambdaClient({ region: process.env.AWS_REGION });

const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'OPTIONS,DELETE'
};

async function verifyToken(token) {
    const params = {
        FunctionName: 'verifyToken', // Replace with your actual Lambda function name
        Payload: new TextEncoder().encode(JSON.stringify({ token })),
    };

    const command = new InvokeCommand(params);
    const response = await lambda.send(command);

    const payload = JSON.parse(new TextDecoder().decode(response.Payload));

    if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
    }

    return payload.isValid;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
        };
    }

    const { authToken, householdId, deletedBy } = JSON.parse(event.body);

    // Verify the token
    const isValid = await verifyToken(authToken);
    if (!isValid) {
        return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({ message: 'Invalid authorization token' }),
        };
    }

    try {
        const household = await prisma.household.findUnique({
            where: { householdId: householdId },
            include: {
                members: {
                    where: {
                        role: 'Owner',
                    }
                }
            }
        });

        if (!household) {
            return {
                statusCode: 404,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: 'Household not found',
                }),
            };
        }

        const owner = household.members.find(member => member.role === 'Owner');

        if (!owner || owner.memberUuid !== deletedBy) {
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

// Example usage:
// const authToken = 'your-auth-token';
// const householdId = 'your-household-id';
// const deletedBy = 'user-uuid-of-deleter';

// deleteHousehold(authToken, householdId, deletedBy)
//     .then(response => console.log(response))
//     .catch(error => console.error('Error deleting household:', error));
